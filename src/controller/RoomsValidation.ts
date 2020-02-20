import Log from "../Util";
import * as JSZip from "jszip";
import {InsightError} from "./IInsightFacade";
import * as parse5 from "parse5";

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
                promisesListRooms.push(dir.async("text"));
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
            let table: any = roomValidator.findTable(indexHTMParsed);

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
    }

    public findTable(indexHTMParsed: any) {
        if (indexHTMParsed.childNodes === "table") {
            return indexHTMParsed.childNodes;
        }
        this.findTable(indexHTMParsed.childNodes);
    }

}
