import Log from "../Util";
import PerformQueryTransformations from "./PerformQueryTransformations";
import PerformQueryValidOptions from "./PerformQueryValidOptions";

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

export default class PerformQueryValid {

    public static isQueryValid(query: any, addedData: any, uniqueIDsInQuery: any[], applyKeysInQuery: any[],
                               groupKeysInQuery: any[], addedRoomsData: any): boolean {
        if (query === null || query === undefined || typeof query !== "object") {      // query is not an object
            return false;
        }
        let queryKeys: any[] = Object.keys(query);
        for (let queryKey of queryKeys) {               // query has a key other than WHERE, OPTIONS, or TRANSFORMATIONS
            if (!(queryKeysAll.includes(queryKey))) {
                return false;
            }
        }
        if (!("WHERE" in query) || !("OPTIONS" in query) || queryKeys.length > 3) {
            return false;   // query doesn't have a WHERE or OPTION key (or both), or doesn't have 2/3 things inside
        }
        let where: any = query["WHERE"];
        let options: any = query["OPTIONS"];
        if (where === null || typeof where !== "object" || typeof where === "string" || Array.isArray(where)
            || where === undefined || options === null || typeof options !== "object" || typeof options === "string"
            || Array.isArray(options) || options === undefined) {
            return false;                                   // check that WHERE and OPTION values are indeed objects
        }
        if ("TRANSFORMATIONS" in query) {
            let transformations: any = query["TRANSFORMATIONS"];
            if (transformations === null || typeof transformations !== "object" || typeof transformations === "string"
            || Array.isArray(transformations) || transformations === undefined) {
                return false;
            }
            if (!PerformQueryTransformations.isTransformationsValid(transformations, addedData, uniqueIDsInQuery,
                applyKeysInQuery, groupKeysInQuery, addedRoomsData)) {
                return false;
            }
        }
        let filterKeys: any[] = Object.keys(where);
        if (filterKeys.length === 0) {                      // a blank WHERE is valid
            return (PerformQueryValidOptions.isOptionsValid(query, addedData, uniqueIDsInQuery, applyKeysInQuery,
                groupKeysInQuery, addedRoomsData)
                && (uniqueIDsInQuery.length === 1));
        }
        if (!this.isWhereFiltersValid(where, addedData, uniqueIDsInQuery, addedRoomsData)) {
            return false;               // check filters in WHERE are correct
        }
        if (!PerformQueryValidOptions.isOptionsValid(query, addedData, uniqueIDsInQuery, applyKeysInQuery,
            groupKeysInQuery, addedRoomsData)) {
            return false;                               // check OPTIONS selections are correct
        }
        if (uniqueIDsInQuery.length > 1) {             // should only have 1 id in query to be valid
            return false;
        }
        return true;
    }

    public static isWhereFiltersValid(filter: any, addedData: any, uniqueIDsInQuery: any[],
                                      addedRoomsData: any): boolean {
        let filterKeys: any[] = Object.keys(filter);
        if (filterKeys.length > 1) {                        // should only have 1 object in it (but can be nested)
            return false;
        } else {
            let filterKey = filterKeys[0];
            if (!(filterKeysAll.includes(filterKey))) {
                return false;                               // doesn't match one of the pre-set filter keys
            }
            if (filterKey === "GT" || filterKey === "LT" || filterKey === "EQ") {   // check mComparators
                let mComparisonKeyValue: any = filter[filterKey];
                if (!this.checkMComparisonValid(mComparisonKeyValue, addedData, uniqueIDsInQuery, addedRoomsData)) {
                    return false;
                }
            }
            if (filterKey === "IS") {           // check sComparators
                let sComparisonKeyValue: any = filter[filterKey];
                if (!this.checkSComparisonValid(sComparisonKeyValue, addedData, uniqueIDsInQuery, addedRoomsData)) {
                    return false;
                }
            }
            if (filterKey === "NOT") {                              // check negation -> recurse
                let negationKeyValue: any = filter[filterKey];
                if (negationKeyValue === null || typeof negationKeyValue !== "object" || negationKeyValue === undefined
                || !(this.isWhereFiltersValid(negationKeyValue, addedData, uniqueIDsInQuery, addedRoomsData))) {
                    return false;
                }
                this.isWhereFiltersValid(negationKeyValue, addedData, uniqueIDsInQuery, addedRoomsData);
            }
            if (filterKey === "AND" || filterKey === "OR") {        // check logic comparator -> recurse
                let logicComparison: any[] = filter[filterKey];
                if (logicComparison === null || !Array.isArray(logicComparison)             // has to contain array
                    || logicComparison === undefined || logicComparison.length === 0) {     // has to not be empty array
                    return false;
                }
                for (let logicComparisonObject of logicComparison) {            // for each thing, check is an object
                    if (typeof logicComparisonObject !== "object" || logicComparisonObject === null
                        || logicComparisonObject === undefined
                        || !(this.isWhereFiltersValid(logicComparisonObject, addedData,
                            uniqueIDsInQuery, addedRoomsData))) {
                        return false;
                    } else {
                        this.isWhereFiltersValid(logicComparisonObject, addedData, uniqueIDsInQuery, addedRoomsData);
                    }
                }
            }
            return true;
        }
    }

    public static checkMComparisonValid(mComparisonKeyValue: any, addedData: any, uniqueIDsInQuery: any[],
                                        addedRoomsData: any): boolean {
        if (mComparisonKeyValue === null || mComparisonKeyValue === undefined
            || typeof mComparisonKeyValue !== "object") {  // has to be an object inside
            return false;
        }
        let mComparisonKeys: any[] = Object.keys(mComparisonKeyValue);
        if (mComparisonKeys.length !== 1) {
            return false;                               // empty value, needs exactly 1 key-value pair
        }
        let mComparisonKey = mComparisonKeys[0];
        if (typeof mComparisonKeyValue[mComparisonKey] !== "number") {
            return false;                               // value associated with mComparison key not a number
        }
        if (typeof mComparisonKey !== "string") {       // key is not a string
            return false;
        }
        let idString: string = mComparisonKey.split("_")[0];        // dataset ID not in our data
        if (!(idString in addedData) && !(idString in addedRoomsData)) {
            return false;
        } else {
            if (!uniqueIDsInQuery.includes(idString)) {
                uniqueIDsInQuery.push(idString);               // if id isn't already in query set of ids, add it
            }
        }
        let mKeyField: string = mComparisonKey.split("_")[1];
        if (idString in addedData) {
            if (!mKeyFieldsCourses.includes(mKeyField)) {   // if courses id, not one of courses mkeys
                return false;
            }
        } else {
            if (!mKeyFieldsRooms.includes(mKeyField)) {   // if rooms id, not one of rooms mkeys
                return false;
            }
        }
        return true;
    }

    public static checkSComparisonValid(sComparisonKeyValue: any, addedData: any, uniqueIDsInQuery: any[],
                                        addedRoomsData: any): boolean {
        if (sComparisonKeyValue === null || sComparisonKeyValue === undefined
            || typeof sComparisonKeyValue !== "object") {  // must be object inside
            return false;
        }
        let sComparisonKeys: any[] = Object.keys(sComparisonKeyValue);
        if (sComparisonKeys.length !== 1) {
            return false;                               // must be exactly 1 key-value pair
        }
        let sComparisonKey = sComparisonKeys[0];
        if (typeof sComparisonKeyValue[sComparisonKey] !== "string") {
            return false;                               // if value associated with IS key isn't a string
        }
        if (typeof sComparisonKey !== "string") {       // key must be a string
            return false;
        }
        let idString: string = sComparisonKey.split("_")[0];        // dataset ID not in our data
        if (!(idString in addedData) && !(idString in addedRoomsData)) {
            return false;
        } else {
            if (!uniqueIDsInQuery.includes(idString)) {        // if id isn't already in query set of ids, add it
                uniqueIDsInQuery.push(idString);
            }
        }
        let sKeyField: string = sComparisonKey.split("_")[1];
        if (idString in addedData) {
            if (!sKeyFieldsCourses.includes(sKeyField)) {
                return false;                           // if courses id, not one of courses skeys
            }
        } else {
            if (!sKeyFieldsRooms.includes(sKeyField)) {
                return false;                           // if rooms id, not one of rooms skeys
            }
        }
        if (sComparisonKeyValue[sComparisonKey] === "") {
            return false;                           // if value is a blank string
        }

        if (sComparisonKeyValue[sComparisonKey] === ("*" || "**")) {
            return true;
        }
        if (!this.checkTooManyStars(sComparisonKeyValue, sComparisonKey, sKeyField)) {
            return false;
        }
        return true;
    }

    public static checkTooManyStars(sComparisonKeyValue: any, sComparisonKey: any, sKeyField: any): boolean {
        let numStars: number = 0;
        for (let i = 0; i < sComparisonKeyValue[sComparisonKey].length ; i++) {
            if (sKeyField.charAt(i) === "*") {
                numStars++;
            }
        }
        if (numStars >= 3
            || sComparisonKeyValue[sComparisonKey]
                .substring(1, sComparisonKeyValue[sComparisonKey].length - 1).includes("*")) {
            return false;       // cannot have more than 2 wildcard stars and cannot have star in middle of string
        }
        return true;
    }
}
