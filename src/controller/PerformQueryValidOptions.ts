import Log from "../Util";
import PerformQueryTransformations from "./PerformQueryTransformations";

let queryKeysAll: string[] = ["WHERE", "OPTIONS", "TRANSFORMATIONS"];
let filterKeysAll: string[] = ["GT", "LT", "EQ", "IS", "NOT", "AND", "OR"];
let mKeyFieldsCourses: string[] = ["avg", "pass", "fail", "audit", "year"];
let sKeyFieldsCourses: string[] = ["dept", "id", "instructor", "title", "uuid"];
let sKeysMKeysCoursesAll: string[] = ["dept", "id", "instructor", "title", "uuid", "avg", "pass",
    "fail", "audit", "year"];
let mKeyFieldsRooms: string[] = ["lat", "lon", "seats"];
let sKeyFieldsRooms: string[] = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
let sKeysMKeysRoomsAll: string[] = ["fullname", "shortname", "number"
    , "name", "address", "type", "furniture", "href", "lat", "lon", "seats"];
let optionKeysAll: string[] = ["COLUMNS", "ORDER"];

export default class PerformQueryValidOptions {

    public static isOptionsValid(query: any, addedData: any, uniqueIDsInQuery: any[],
                                 applyKeysInQuery: any[], groupKeysInQuery: any[], addedRoomsData: any): boolean {
        let options: any = query["OPTIONS"];
        let optionsKeys: any[] = Object.keys(options);
        if (optionsKeys.length === 0 || optionsKeys.length > 2) {   // has to be 1 or 2 things in there (COL and ORDER)
            return false;
        }
        for (let optionsKey of optionsKeys) {
            if (!optionKeysAll.includes(optionsKey)) {         // options key is something other than COLUMNS or ORDER
                return false;
            }
        }
        if (!("COLUMNS" in options)) {                      // COLUMNS must be present
            return false;
        }
        let columnsVals: any[] = options["COLUMNS"];
        if (!this.checkColumnsValid(columnsVals, addedData, uniqueIDsInQuery, applyKeysInQuery,
            groupKeysInQuery, query, addedRoomsData)) {
            return false;                           // check if COLUMNS is valid
        }
        if ("ORDER" in options) {
            let orderValue: any = options["ORDER"];
            if (!this.checkOrderValid(orderValue, columnsVals)) {
                return false;
            }
        }
        return true;
    }

    public static checkColumnsValid(columnsVals: any[], addedData: any, uniqueIDsInQuery: any[],
                                    applyKeysInQuery: any[], groupKeysInQuery: any[], query: any,
                                    addedRoomsData: any): boolean {
        if (columnsVals === null || columnsVals === undefined
            || columnsVals.length === 0 || !Array.isArray(columnsVals)) {
            return false;           // must be non-empty array
        }
        for (let columnsValue of columnsVals) {               // each thing in array must be a string
            if (typeof columnsValue !== "string") {
                return false;
            }
            if (("TRANSFORMATIONS" in query)) {
                if (!(applyKeysInQuery.includes(columnsValue)) && !(groupKeysInQuery.includes(columnsValue))) {
                    return false;       // if GROUP + APPLY present,
                }                       // check if columnsVals correspond to either GROUP keys or applyKeys in APPLY
            } else {                    // GROUP/APPLY not present, so columnsVals must be mkey or skey
                let idString: string = columnsValue.split("_")[0];
                if (!(idString in addedData) && !(idString in addedRoomsData)) {      // id not found in added data sets
                    return false;
                } else {
                    if (!uniqueIDsInQuery.includes(idString)) {    // if id isn't already in query set of ids, add it
                        uniqueIDsInQuery.push(idString);
                    }
                }
                let attributeField: string = columnsValue.split("_")[1];
                if (idString in addedData) {
                    if (!sKeysMKeysCoursesAll.includes(attributeField)) {
                        return false;   // if Courses id, keyField must match one of courses skeys or mkeys
                    }
                } else {
                    if (!sKeysMKeysRoomsAll.includes(attributeField)) {
                        return false;   // if Rooms id, keyField must match one of rooms skeys or mkeys
                    }
                }
            }
        }
        return true;
    }

    public static checkOrderValid(orderValue: any, columnsVals: any[]): boolean {
        if (orderValue === null || orderValue === undefined ||
            !(typeof orderValue === "string" || typeof orderValue === "object")) {
            return false;               // order type must be a string or object
        }
        if (typeof orderValue === "string") {
            for (let columnsValue of columnsVals) {      // order string has to match at least one of the column strings
                if (orderValue === columnsValue) {
                    return true;
                }
            }
            return false;
        }
        if (typeof orderValue === "object") {
            let orderKeys: any[] = Object.keys(orderValue);
            if (orderKeys.length !== 2 || !("dir" in orderValue) || !("keys" in orderValue)) {
                return false;           // doesn't have 2 key-value pairs, missing 'dir' or missing 'keys'
            }
            if (orderValue["dir"] !== "UP" && orderValue["dir"] !== "DOWN") {
                return false;
            }
            if (!(Array.isArray(orderValue["keys"]))) {
                return false;
            }
            if (orderValue["keys"].length === 0) {
                return false;
            }
            for (let anyKey of orderValue["keys"]) {
                if (!(columnsVals.includes(anyKey))) {
                    return false;
                }
            }
            return true;
        }
        return false;                                   // if by end none match, return false
    }
}
