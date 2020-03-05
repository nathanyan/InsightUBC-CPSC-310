import * as parse5 from "parse5";
import {DefaultTreeNode} from "parse5";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class RoomChecker {
    private addedRoomData: any;

    constructor(memoryData: any) {
        this.addedRoomData = memoryData;
    }

    public returnRoomTable(rooms: any, roomHrefPath: any) {
        let parsedHREF: any = this.parseHREF(rooms[roomHrefPath]);
        let roomBody: any = this.findBodyToParse(parsedHREF);
        let roomTable: any = this.findSection(roomBody);
        return {roomBody, roomTable};
    }

    public returnHREF(child: DefaultTreeNode | any) {
        let attributesToSearch: any = Object.values(child["attrs"]);
        let roomHrefPath: any = this.findHREFPath(attributesToSearch);
        return roomHrefPath;
    }

    public findRoomShortnameData(tableData: DefaultTreeNode | any): string {
        let roomShortname: string = null;
        let attributes: any = Object.values(tableData["attrs"]);
        for (let attribute of attributes) {
            if (attribute["name"] === "class") {
                if (attribute["value"] === "views-field views-field-field-building-code") {
                    roomShortname = tableData.childNodes[0].value.trim();
                }
            }
        }
        return roomShortname;
    }

    public findTableBody(table: any): any {
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
        let section: any = null;
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

    private findHREFPath(attributesToSearch: any): string {
        let hrefPath: string = "";
        for (let attribute of attributesToSearch) {
            if (attribute["name"] === "href") {
                hrefPath = attribute["value"];
            }
        }
        return hrefPath;
    }

    private parseHREF(href: any): any {
        let parsedRoom: any = null;
        try {
            parsedRoom = parse5.parse(href);
            return parsedRoom;
        } catch {
            return;
        }
    }

    public findBuildingInfo(roomBody: any): any {
        let buildingInfo: any = null;
        for (let child of roomBody.childNodes) {
            if (child["attrs"] !== undefined || null) {
                for (let attr of Object.values(child["attrs"])) {
                    let a: any = attr;
                    if (a.name === "id" && a.value === "building-info") {
                        buildingInfo = child;
                        return buildingInfo;
                    } else {
                        let ret = this.findBuildingInfo(child);
                        if (ret !== null) {
                            return ret;
                        }
                    }
                }
            } else {
                if (child.nodeName === "div" && child.childNodes.length !== 0) {
                    let ret = this.findBuildingInfo(child);
                    if (ret !== null) {
                        return ret;
                    }
                }
            }
        }
        return buildingInfo;
    }

    public findRoomFullname(roomBuildingInfo: any): string {
        let roomFullname: string = null;
        for (let child of roomBuildingInfo.childNodes) {
            if ((child["attrs"] !== undefined || null) && child.nodeName === "span" && child.childNodes.length !== 0) {
                for (let attr of Object.values(child["attrs"])) {
                    let a: any = attr;
                    if (a.name === "class" && a.value === "field-content") {
                        for (let subNodes of child.childNodes) {
                            if (subNodes.nodeName === "#text") {
                                roomFullname = subNodes.value;
                                return roomFullname;
                            }
                        }
                    }
                }
            } else {
                if (child.nodeName === "h2" && child.childNodes.length !== 0) {
                    let ret = this.findRoomFullname(child);
                    if (ret !== null) {
                        return ret;
                    }
                }
            }
        }
        return roomFullname;
    }

    public findRoomAddress(roomBuildingInfo: any): string {
        let roomAddress: string = null;
        for (let child of roomBuildingInfo.childNodes) {
            if ((child["attrs"] !== undefined || null) && child.nodeName === "div" && child.childNodes.length !== 0) {
                for (let attr of Object.values(child["attrs"])) {
                    let a: any = attr;
                    if (a.name === "class" && a.value === "field-content") {
                        for (let subNodes of child.childNodes) {
                            if (subNodes.nodeName === "#text") {
                                roomAddress = subNodes.value;
                                return roomAddress;
                            }
                        }
                    } else {
                        if (child.nodeName === "div" && child.childNodes.length !== 0) {
                            let ret = this.findRoomAddress(child);
                            if (ret !== null) {
                                return ret;
                            }
                        }
                    }
                }
            } else {
                if (child.nodeName === "div" && child.childNodes.length !== 0) {
                    let ret = this.findRoomAddress(child);
                    if (ret !== null) {
                        return ret;
                    }
                }
            }
        }
        return roomAddress;
    }

    public parseTableRooms(roomTableBody: any, roomFullname: string, roomAddress: string, roomShortname: string,
                           roomHrefPath: string): any[] {
        let buildingRooms: any[] = [];
        for (let tableRow of roomTableBody.childNodes) {
            let roomNumber: string = null;
            let roomSeats: number = null;
            let roomType: string = null;
            let roomFurniture: string = null;
            let roomsKeys: any = {};
            if (tableRow.nodeName === "tr") {
                for (let tableCell of tableRow.childNodes) {
                    if (tableCell.nodeName === "td") {
                        for (let attr of Object.values(tableCell["attrs"])) {
                            let a: any = attr;
                            if (a.name === "class") {
                                roomSeats = this.setRoomSeats(attr, tableCell, roomSeats);
                                roomFurniture = this.setRoomFurniture(attr, roomFurniture, tableCell);
                                roomType = this.setRoomType(attr, roomType, tableCell);
                                if (a.value === "views-field views-field-field-room-number") {
                                    for (let child of tableCell.childNodes) {
                                        if (child.nodeName === "a") {
                                            for (let attribute of Object.values(child["attrs"])) {
                                                let a2: any = attribute;
                                                if (a2.name === "href") {
                                                    roomNumber = child.childNodes[0].value.toString();
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                roomsKeys["roomAddress"] = roomAddress;
                roomsKeys["roomShortname"] = roomShortname;
                roomsKeys["roomFullname"] = roomFullname;
                roomsKeys["roomHref"] = roomHrefPath;
                roomsKeys["roomNumber"] = roomNumber;
                roomsKeys["roomSeats"] = roomSeats;
                roomsKeys["roomType"] = roomType;
                roomsKeys["roomFurniture"] = roomFurniture;
                roomsKeys["roomName"] = null;
                roomsKeys["roomLat"] = null;
                roomsKeys["roomLon"] = null;
                buildingRooms.push(roomsKeys);
            }
        }
        return buildingRooms;
    }

    private setRoomType(attr: any, roomType: string, tableCell: DefaultTreeNode | any) {
        if (attr.value === "views-field views-field-field-room-type") {
            roomType = tableCell.childNodes[0].value.toString().trim();
        }
        return roomType;
    }

    private setRoomFurniture(attr: any, roomFurniture: string, tableCell: DefaultTreeNode | any) {
        if (attr.value === "views-field views-field-field-room-furniture") {
            roomFurniture = tableCell.childNodes[0].value.toString().trim();
        }
        return roomFurniture;
    }

    private setRoomSeats(attr: any, tableCell: DefaultTreeNode | any, roomSeats: number) {
        if (attr.value === "views-field views-field-field-room-capacity") {
            if (tableCell.childNodes[0].value.length === 0) {
                roomSeats = 0;
            } else {
                roomSeats = parseFloat(tableCell.childNodes[0].value);
            }
        }
        return roomSeats;
    }
}
