import Log from "../Util";
import * as JSZip from "jszip";
import {InsightError} from "./IInsightFacade";
import * as parse5 from "parse5";
import {DefaultTreeNode} from "parse5";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class RoomsValidation {
    private addedData: any;

    constructor(memoryData: any) {
        Log.trace("Validating Rooms");
        this.addedData = memoryData;
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
                        resolve({filePath: dir.name, data: result});
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

    public checkEachRoom(promisesListRooms: Array<Promise<any>>, reject: (reason?: any) => void,
                         indexFileExists: boolean, roomValidator: RoomsValidation) {
        Promise.all(promisesListRooms).then((resultBuildings: string[]) => {
            if (resultBuildings.length === 0) {
                reject(new InsightError());
            }
            if (indexFileExists === false) {
                reject(new InsightError());
            }
            let roomData: JSON[] = [];
            let indexHTMParsed: any;
            try {
                let numberOfRooms: number = resultBuildings.length;
                let last: number = numberOfRooms - 1;
                let index: string = resultBuildings[last];
                indexHTMParsed = parse5.parse(index);
            } catch {
                return;
            }
            let htmlMainBody: any = roomValidator.findBodyToParse(indexHTMParsed);
            let table: any = roomValidator.findSection(htmlMainBody);
            let tableBody: any = this.findTableBody(table);

            // this is once we follow the link from table
            resultBuildings.forEach((room: string) => {
                try {
                    let parsedHTMLString: any = parse5.parse(room);
                } catch {
                    return;
                }
            });
        }).catch((err: any) => {
            reject(new InsightError());
        });
        //
    }

    private findTableBody(table: any): any {
        let tableBody: any = null;
        for (let childNode of table.childNodes) {
            if (childNode.nodeName === "tbody") {
                tableBody = childNode;
                break;
            }
        }
        return tableBody;
    }

    public findBodyToParse(indexHTMParsed: any): any {
        let htmlFile: any;
        for (let childNode of indexHTMParsed.childNodes) {
            if (childNode.nodeName === "html") {
                htmlFile = childNode;
            }
        }
        let htmlBody: any;
        for (let childNode of htmlFile.childNodes) {
            if (childNode.nodeName === "body") {
                htmlBody = childNode;
            }
        }
        return htmlBody;
    }

    public findSection(htmlMainBody: any): any {
        let table: any = null;
        let section: any;
        for (let childNode of htmlMainBody.childNodes) {
            if (childNode.nodeName === "section" && childNode.childNodes.length !== 0) {
                section = childNode;
                table = this.findTable(section);
                break;
            } else {
                if (childNode.nodeName === "div" && childNode.childNodes.length !== 0) {
                    let ret = this.findSection(childNode);
                    if (ret !== null) {
                        return ret;
                    }
                }
            }
        }
        return table;
    }

    private findTable(section: DefaultTreeNode | any): any {
        let returnTable: any = null;
        for (let child of section.childNodes) {
            if (child.nodeName === "table" && child.childNodes.length !== 0) {
                returnTable = child;
                return returnTable;
            } else {
                if (child.nodeName === "div" && child.childNodes.length !== 0) {
                    let ret = this.findTable(child);
                    if (ret !== null) {
                        return ret;
                    }
                }
            }
        }
        return returnTable;
    }
}
