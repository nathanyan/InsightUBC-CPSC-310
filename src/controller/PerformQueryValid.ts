import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, ResultTooLargeError} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
import PerformQueryTransformations from "./PerformQueryTransformations";

let queryKeysAll: string[] = ["WHERE", "OPTIONS", "TRANSFORMATIONS"];
let filterKeysAll: string[] = ["GT", "LT", "EQ", "IS", "NOT", "AND", "OR"];
let mKeyFieldsAll: string[] = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
let sKeyFieldsAll: string[] = ["dept", "id", "instructor", "title", "uuid", "fullname", "shortname", "number"
    , "name", "address", "type", "furniture", "href"];
let sKeysMKeysAll: string[] = ["dept", "id", "instructor", "title", "uuid", "fullname", "shortname", "number"
    , "name", "address", "type", "furniture", "href", "avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
let optionKeysAll: string[] = ["COLUMNS", "ORDER"];
let transformationKeysAll: string[] = ["GROUP", "APPLY"];
let applyTokensAll: string[] = ["MAX", "MIN", "AVG", "COUNT", "SUM"];

export default class PerformQueryValid {

    public static isQueryValid(query: any, addedData: any, uniqueIDsInQuery: any[], applyKeysInQuery: any[],
                               groupKeysInQuery: any[]): boolean {
        if (query === null || query === undefined || typeof query !== "object") {      // query is not an object
            return false;
        }
        let queryKeys: any[] = Object.keys(query);
        for (let queryKey of queryKeys) {               // query has a key other than WHERE, OPTIONS, or TRANSFORMATIONS
            if (!(queryKeysAll.includes(queryKey))) {
                return false;
            }
        }
        if (!("WHERE" in query) || !("OPTIONS" in query) || queryKeys.length !== (2 || 3)) {
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
                applyKeysInQuery, groupKeysInQuery)) {
                return false;
            }
        }
        let filterKeys: any[] = Object.keys(where);
        if (filterKeys.length === 0) {                      // a blank WHERE is valid
            return (this.isOptionsValid(query, addedData, uniqueIDsInQuery, applyKeysInQuery, groupKeysInQuery)
                && (uniqueIDsInQuery.length === 1));
        }
        if (!this.isWhereFiltersValid(where, addedData, uniqueIDsInQuery)) {    // check filters in WHERE are correct
            return false;
        }
        if (!this.isOptionsValid(query, addedData, uniqueIDsInQuery, applyKeysInQuery, groupKeysInQuery)) {
            return false;                               // check OPTIONS selections are correct
        }
        if (uniqueIDsInQuery.length > 1) {             // should only have 1 id in query to be valid
            return false;
        }
        return true;
    }

    public static isWhereFiltersValid(filter: any, addedData: any, uniqueIDsInQuery: any[]): boolean {
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
                if (!this.checkMComparisonValid(mComparisonKeyValue, addedData, uniqueIDsInQuery)) {
                    return false;
                }
            }
            if (filterKey === "IS") {           // check sComparators
                let sComparisonKeyValue: any = filter[filterKey];
                if (!this.checkSComparisonValid(sComparisonKeyValue, addedData, uniqueIDsInQuery)) {
                    return false;
                }
            }
            if (filterKey === "NOT") {                              // check negation -> recurse
                let negationKeyValue: any = filter[filterKey];
                if (negationKeyValue === null || typeof negationKeyValue !== "object" || negationKeyValue === undefined
                || !(this.isWhereFiltersValid(negationKeyValue, addedData, uniqueIDsInQuery))) {
                    return false;
                }
                this.isWhereFiltersValid(negationKeyValue, addedData, uniqueIDsInQuery);
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
                        || !(this.isWhereFiltersValid(logicComparisonObject, addedData, uniqueIDsInQuery))) {
                        return false;
                    } else {
                        this.isWhereFiltersValid(logicComparisonObject, addedData, uniqueIDsInQuery);
                    }
                }
            }
            return true;
        }
    }

    public static checkMComparisonValid(mComparisonKeyValue: any, addedData: any, uniqueIDsInQuery: any[]): boolean {
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
        let mKeyField: string = mComparisonKey.split("_")[1];
        if (!mKeyFieldsAll.includes(mKeyField)) {   // mkey isn't one of the pre-set options
            return false;
        }
        let idString: string = mComparisonKey.split("_")[0];        // dataset ID not in our data
        if (!(idString in addedData)) {
            return false;
        } else {
            if (!uniqueIDsInQuery.includes(idString)) {
                uniqueIDsInQuery.push(idString);               // if id isn't already in query set of ids, add it
            }
        }
        return true;
    }

    public static checkSComparisonValid(sComparisonKeyValue: any, addedData: any, uniqueIDsInQuery: any[]): boolean {
        Log.trace("Reach beginning of S comparison check");
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
        let sKeyField: string = sComparisonKey.split("_")[1];
        if (!sKeyFieldsAll.includes(sKeyField)) {
            return false;                           // if skey fields don't match any of the pre-set filter options
        }
        let idString: string = sComparisonKey.split("_")[0];        // dataset ID not in our data
        if (!(idString in addedData)) {
            return false;
        } else {
            if (!uniqueIDsInQuery.includes(idString)) {        // if id isn't already in query set of ids, add it
                uniqueIDsInQuery.push(idString);
            }
        }
        if (sComparisonKeyValue[sComparisonKey] === "") {
            return false;                           // if value is a blank string
        }

        if (sComparisonKeyValue[sComparisonKey] === ("*" || "**")) {
            return true;
        }
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

    public static isOptionsValid(query: any, addedData: any, uniqueIDsInQuery: any[],
                                 applyKeysInQuery: any[], groupKeysInQuery: any[]): boolean {
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
        let columnsValues: any[] = options["COLUMNS"];
        if (!this.checkColumnsValid(columnsValues, addedData, uniqueIDsInQuery, applyKeysInQuery,
            groupKeysInQuery, query)) {
            return false;                           // check if COLUMNS is valid
        }
        if ("ORDER" in options) {
            let orderValue: any = options["ORDER"];
            if (!this.checkOrderValid(orderValue, columnsValues, addedData, uniqueIDsInQuery)) {    // check if OPTIONS
                return false;
            }
        }
        return true;
    }

    public static checkColumnsValid(columnsValues: any[], addedData: any, uniqueIDsInQuery: any[],
                                    applyKeysInQuery: any[], groupKeysInQuery: any[], query: any): boolean {
        if (columnsValues === null || columnsValues === undefined
            || columnsValues.length === 0 || !Array.isArray(columnsValues)) {
            return false;           // must be non-empty array
        }
        for (let columnsValue of columnsValues) {               // each thing in array must be a string
            if (typeof columnsValue !== "string") {
                return false;
            }
            if (("TRANSFORMATIONS" in query)) {
                if (!(columnsValue in applyKeysInQuery) && !(columnsValue in groupKeysInQuery)) {
                    return false;       // if GROUP + APPLY present,
                }                       // check if columnsValues correspond to either GROUP keys or applyKeys in APPLY
            } else {                    // GROUP/APPLY not present, so columnsValues must be mkey or skey
                let attributeField: string = columnsValue.split("_")[1];   // keyField must match one of above
                if (!sKeysMKeysAll.includes(attributeField)) {
                    return false;
                }
                let idString: string = columnsValue.split("_")[0];
                if (!(idString in addedData)) {                            // id not found in added data sets
                    return false;
                } else {
                    if (!uniqueIDsInQuery.includes(idString)) {    // if id isn't already in query set of ids, add it
                        uniqueIDsInQuery.push(idString);
                    }
                }
            }
        }
        return true;
    }

    public static checkOrderValid(orderValue: any, columnsValues: any[], addedData: any, uniqueIDsInQuery: any[]):
        boolean {
        if (orderValue === null || orderValue === undefined || typeof orderValue !== "string") {
            return false;               // order type must be a string
        }
        let attributeField: string = orderValue.split("_")[1];   // keyField must match one of above
        if (!sKeysMKeysAll.includes(attributeField)) {
            return false;
        }
        let idString: string = orderValue.split("_")[0];
        if (!(idString in addedData)) {                                    // id not found in added data sets
            return false;
        } else {
            if (!uniqueIDsInQuery.includes(idString)) {        // if id isn't already in query set of ids, add it
                uniqueIDsInQuery.push(idString);
            }
        }
        for (let columnsValue of columnsValues) {       // order string has to match at least one of the column strings
            if (orderValue === columnsValue) {
                return true;
            }
        }
        return false;                                   // if by end none match, return false
    }
}
