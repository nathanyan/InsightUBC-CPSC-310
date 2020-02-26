import Log from "../Util";
import * as JSZip from "jszip";
import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import * as parse5 from "parse5";
import * as fs from "fs";
import RoomChecker from "./RoomChecker";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class RoomsValidation {
    private addedRoomData: any;

    constructor(memoryData: any) {
        Log.trace("Validating Rooms");
        this.addedRoomData = memoryData;
    }

    public convertRoomsToString(folder2: JSZip, roomsFolderExists: boolean, roomValidator: RoomsValidation,
                                indexFileExists: boolean, promisesListRooms: Array<Promise<any>>) {
        Object.values(folder2.files).forEach((dir2) => {
            roomsFolderExists = roomValidator.checkIfDirectory(dir2, roomsFolderExists);
            indexFileExists = roomValidator.checkIfRoomsExist(dir2, roomsFolderExists, indexFileExists,
                promisesListRooms);
        });
        return indexFileExists;
    }

    public checkIfDirectory(dir2: JSZip.JSZipObject, roomsFolderExists: boolean) {
        if (dir2.dir) {
            if (dir2.name.includes("rooms/")) {
                roomsFolderExists = true;
            }
        }
        return roomsFolderExists;
    }

    public checkIfRoomsExist(dir: JSZip.JSZipObject, roomsFolderExists: boolean, indexFileExists: boolean,
                             promisesListRooms: Array<Promise<any>>) {
        if ((!dir.dir) && roomsFolderExists) {
            if (dir.name.includes("rooms/")) {
                promisesListRooms.push(new Promise<any>((resolve, reject) => {
                    dir.async("text").then((result) => {
                        let relativePath: string = "." + dir.name.substr(5);
                        resolve({filePath: relativePath, data: result});
                    }).catch((err: any) => {
                        reject(new InsightError());
                    });
                }));
            }
            if (dir.name.includes("index.htm")) {
                indexFileExists = true;
            }
        }
        return indexFileExists;
    }

    public checkEachRoom(promisesListRooms: Array<Promise<any>>, reject: (reason?: any)  => void,
                         indexFileExists: boolean, roomValidator: RoomsValidation, id: string,
                         kind: InsightDatasetKind.Rooms, resolve:
                             (value?: (PromiseLike<string[]> | string[])) => void) {
        Promise.all(promisesListRooms).then((resultBuildings: string[]) => {
            if (resultBuildings.length === 0) {
                reject(new InsightError());
            }
            if (indexFileExists === false) {
                reject(new InsightError());
            }
            let roomChecker: RoomChecker = new RoomChecker(this.addedRoomData);
            let roomData: JSON[] = [];
            let rooms: any = {};
            // transform result files array into map
            this.convertResultToMap(resultBuildings, rooms);
            let indexToParse: string = "";
            let indexHTMParsed: any = null;
            indexToParse = rooms["./index.htm"];
            try {
                indexHTMParsed = parse5.parse(indexToParse);
            } catch {
                return;
            }
            let htmlMainBody: any = roomChecker.findBodyToParse(indexHTMParsed);
            let table: any = roomChecker.findSection(htmlMainBody);
            let tableBody: any = roomChecker.findTableBody(table);
            roomData = this.parseEachRoom(tableBody, rooms, roomData, id);
            if (roomData.length !== 0) {
                this.addedRoomData[id] = roomData;
                let saved = {id: id, kind: kind, data: this.addedRoomData};
                let stringifiedFile = JSON.stringify(saved);
                try {
                    fs.writeFileSync("./data/" + id, stringifiedFile);
                } catch (e) {
                    reject(new InsightError());
                }
                resolve(Object.keys(this.addedRoomData));
            } else {
                reject(new InsightError());
            }
        }).catch((err: any) => {
            reject(new InsightError());
        });
    }

    public convertResultToMap(resultBuildings: any[], rooms: any) {
        resultBuildings.forEach((json: any) => {
            rooms[json["filePath"]] = json["data"];
        });
    }

    public parseEachRoom(tableBody: any, rooms: any, roomData: JSON[], id: string): any {
        let roomChecker: RoomChecker = new RoomChecker(this.addedRoomData);
        for (let row of tableBody.childNodes) {
            if (row.nodeName === "tr") {
                let codeSet: boolean = false, roomShortName: string = null;
                for (let tableData of row.childNodes) {
                    if (tableData.nodeName === "td") {
                        if (!codeSet) {
                            roomShortName = roomChecker.findRoomShortnameData(tableData);
                            if (roomShortName !== null) {
                                codeSet = true;
                            }
                        }
                        for (let child of tableData.childNodes) {
                            if (child.nodeName === "a") {
                                for (let sub of child.childNodes) {
                                    if (sub.nodeName === "#text" && sub.value === "More info") {
                                        let roomHrefPath = roomChecker.returnHREF(child);
                                        if (roomHrefPath === "") {
                                            continue;
                                        } else {
                                            let {roomBody, roomTable} =
                                                roomChecker.returnRoomTable(rooms, roomHrefPath);
                                            if (roomTable === null) {
                                                continue;
                                            }
                                            let roomTableBody: any = roomChecker.findTableBody(roomTable);
                                            let roomBuildingInfo: any = roomChecker.findBuildingInfo(roomBody);
                                            if (roomBuildingInfo === null) {
                                                continue;
                                            } else {
                                                let roomAddress = roomChecker.findRoomAddress(roomBuildingInfo);
                                                let roomFullname = roomChecker.findRoomFullname(roomBuildingInfo);
                                                if (roomFullname === null || roomAddress === null) {
                                                    continue;
                                                }
                                                roomData = roomChecker.parseTableRooms(roomTableBody, roomFullname,
                                                    roomAddress, roomShortName, roomHrefPath, roomData, id);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return roomData;
    }

    public formatKeys(roomName: string, roomShortname: string, roomNumber: string, formattedKeys: any, id: string,
                      roomFullname: string, roomAddress: string, roomSeats: number, roomType: string,
                      roomFurniture: string, roomHrefPath: string, roomData: any[]) {
        roomName = roomShortname + "_" + roomNumber;
        formattedKeys[id + "_" + "fullname"] = roomFullname;
        formattedKeys[id + "_" + "shortname"] = roomShortname;
        formattedKeys[id + "_" + "number"] = roomNumber;
        formattedKeys[id + "_" + "name"] = roomName;
        formattedKeys[id + "_" + "address"] = roomAddress;
        formattedKeys[id + "_" + "seats"] = roomSeats;
        formattedKeys[id + "_" + "type"] = roomType;
        formattedKeys[id + "_" + "furniture"] = roomFurniture;
        formattedKeys[id + "_" + "href"] = roomHrefPath;
        roomData.push(formattedKeys);
    }
}
