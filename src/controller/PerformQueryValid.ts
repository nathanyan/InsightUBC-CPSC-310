import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, ResultTooLargeError} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";

let queryKeysAll: string[] = ["WHERE", "OPTIONS"];
let filterKeysAll: string[] = ["GT", "LT", "EQ", "IS", "NOT", "AND", "OR"];
let mKeyFieldsAll: string[] = ["avg", "pass", "fail", "audit", "year"];
let sKeyFieldsAll: string[] = ["dept", "id", "instructor", "title", "uuid"];
let sKeysMKeysAll: string[] = ["dept", "id", "instructor", "title", "uuid", "avg", "pass", "fail", "audit", "year"];
let optionKeysAll: string[] = ["COLUMNS", "ORDER"];

export default class PerformQueryValid {

    public static isQueryValid(query: any, addedData: any, uniqueIDsInQuery: any[]): boolean {
        Log.trace("reached isQueryValid");
        if (query === null || typeof query !== "object") {      // query is not an object
            Log.trace("query is not an object");
            return false;
        }
        let queryKeys: any[] = Object.keys(query);
        for (let queryKey of queryKeys) {                       // query has a key other than WHERE or OPTIONS
            if (!(queryKeysAll.includes(queryKey))) {
                Log.trace("query has something other than WHERE or OPTIONS");
                return false;
            }
        }
        if (!("WHERE" in query) || !("OPTIONS" in query)) {     // query doesn't have a WHERE or OPTION key (or both)
            Log.trace("Query doesn't have a WHERE and/or OPTIONS");
            return false;
        }
        let where: any = query["WHERE"];
        let options: any = query["OPTIONS"];
        if (where === null || typeof where !== "object" || options === null || typeof options !== "object") {
            Log.trace("WHERE or OPTIONS values are not objects");
            return false;                                   // check that WHERE and OPTION values are objects
        }
        if (!this.isWhereFiltersValid(where, addedData, uniqueIDsInQuery)) {    // check filters in WHERE are correct
            Log.trace("WHERE is invalid");
            return false;
        }
        if (!this.isOptionsValid(options, addedData, uniqueIDsInQuery)) {        // check OPTIONS selections are correct
            Log.trace("OPTIONS is invalid");
            return false;
        }
        if (uniqueIDsInQuery.length > 1) {             // should only have 1 id in query to be valid
            Log.trace("More than 1 ID in query");
            return false;
        }
        return true;
    }

    public static isWhereFiltersValid(filter: any, addedData: any, uniqueIDsInQuery: any[]): boolean {
        let filterKeys: any[] = Object.keys(filter);
        if (filterKeys.length === 0) {                      // a blank WHERE is valid
            return true;    // Log.trace("Blank WHERE");
        }
        if (filterKeys.length > 1) {                        // should only have 1 object in it (but can be nested)
            return false;   // Log.trace("Where has more than 1 object in it");
        } else {
            let filterKey = filterKeys[0];
            if (!filterKeysAll.includes(filterKey)) {
                return false;                               // doesn't match one of the pre-set filter keys
            }       // Log.trace("Filter key is something other than GT, LT, EQ, IS, NOT, AND, OR");
            if (filterKey === "GT" || filterKey === "LT" || filterKey === "EQ") {   // check mComparators
                let mComparisonKeyValue: any = filter[filterKey]; // Log.trace("Reach GT LT EQ");
                if (!this.checkMComparisonValid(mComparisonKeyValue, addedData, uniqueIDsInQuery)) {
                    return false;       // Log.trace("M comparison invalid");
                }
            }
            if (filterKey === "IS") {           // check sComparators Log.trace("Reach IS");
                let sComparisonKeyValue: any = filter[filterKey];
                if (!this.checkSComparisonValid(sComparisonKeyValue, addedData, uniqueIDsInQuery)) {
                    return false;               // Log.trace("S comparison invalid");
                }
            }
            if (filterKey === "NOT") {                              // check negation -> recurse
                let negationKeyValue: any = filter[filterKey];  //  Log.trace("reach NOT");
                if (negationKeyValue === null || typeof negationKeyValue !== "object") {
                    return false;   // Log.trace("Value in NOT is not an object");
                }
                this.isWhereFiltersValid(negationKeyValue, addedData, uniqueIDsInQuery);
            }
            if (filterKey === "AND" || filterKey === "OR") {        // check logic comparator -> recurse
                let logicComparison: any[] = filter[filterKey];     // Log.trace("reach AND OR");
                if (logicComparison === null || !Array.isArray(logicComparison) // has to contain array
                    || logicComparison.length === 0) {                          // has to not be empty array
                    return false;   // Log.trace("Value in logic operator is null, not an array or an empty array");
                }
                for (let logicComparisonObject of logicComparison) {            // for each thing, check is an object
                    if (typeof logicComparisonObject !== "object" || logicComparisonObject === null) {
                        return false;       // Log.trace("Item in logic operator array is not an object");
                    } else {
                        this.isWhereFiltersValid(logicComparisonObject, addedData, uniqueIDsInQuery);
                    }
                }
            }
            return true;
        }
    }

    public static checkMComparisonValid(mComparisonKeyValue: any, addedData: any, uniqueIDsInQuery: any[]): boolean {
        Log.trace("reach checkMComparisonValid");
        if (mComparisonKeyValue === null || typeof mComparisonKeyValue !== "object") {  // has to be an object inside
            Log.trace("mComparison inside not an object");
            return false;
        }
        let mComparisonKeys: any[] = Object.keys(mComparisonKeyValue);
        if (mComparisonKeys.length !== 1) {
            Log.trace("0 or more than 2 objects in the mComparison");
            return false;                               // empty value, needs exactly 1 key-value pair
        }
        let mComparisonKey = mComparisonKeys[0];
        if (typeof mComparisonKeyValue[mComparisonKey] !== "number") {
            Log.trace("the value associated with m comparison op is not a number");
            return false;                               // value associated with mComparison key not a number
        }
        if (typeof mComparisonKey !== "string") {       // key is not a string
            Log.trace("key for m comparison is not a string");
            return false;
        }
        let mKeyField: string = mComparisonKey.split("_")[1];
        if (!mKeyFieldsAll.includes(mKeyField)) {   // mkey isn't one of the pre-set options
            Log.trace("mkey field is something other than ...");
            return false;
        }
        let idString: string = mComparisonKey.split("_")[0];        // dataset ID not in our data
        if (!(idString in addedData)) {
            Log.trace("idstring in mcomparison is not found in our added datasets");
            return false;
        } else {
            Log.trace("idstring in mcomparison is found in our added dataset");
            if (!uniqueIDsInQuery.includes(idString)) {
                Log.trace("idstring in mcomparison not yet added to our list of unique id's in query -> add it");
                uniqueIDsInQuery.push(idString);               // if id isn't already in query set of ids, add it
            }
        }
        Log.trace("reached end, M Comparison end is valid");
        return true;
    }

    public static checkSComparisonValid(sComparisonKeyValue: any, addedData: any, uniqueIDsInQuery: any[]): boolean {
        Log.trace("Reach beginning of S comparison check");
        if (sComparisonKeyValue === null || typeof sComparisonKeyValue !== "object") {  // must be object inside
            Log.trace("S comparison is not an object");
            return false;
        }
        let sComparisonKeys: any[] = Object.keys(sComparisonKeyValue);
        if (sComparisonKeys.length !== 1) {
            Log.trace("scomparison is 0 or more than 2 key-values");
            return false;                               // must be exactly 1 key-value pair
        }
        let sComparisonKey = sComparisonKeys[0];
        if (typeof sComparisonKeyValue[sComparisonKey] !== "string") {
            Log.trace("scomparison value is not a string");
            return false;                               // if value associated with IS key isn't a string
        }
        if (typeof sComparisonKey !== "string") {       // key must be a string
            Log.trace("scomparison key is not a string");
            return false;
        }
        let sKeyField: string = sComparisonKey.split("_")[1];
        if (!sKeyFieldsAll.includes(sKeyField)) {
            Log.trace("scomparison key field is something other than dept id instructor title uuid");
            return false;                           // if skey fields don't match any of the pre-set filter options
        }
        let idString: string = sComparisonKey.split("_")[0];        // dataset ID not in our data
        if (!(idString in addedData)) {
            Log.trace("idstring in s comparison is not found in our added dataset");
            return false;
        } else {
            Log.trace("id string in s comparison is in our added datasets");
            if (!uniqueIDsInQuery.includes(idString)) {        // if id isn't already in query set of ids, add it
                Log.trace("idstring in scomparison not yet added to our list of unique id's in query -> add it");
                uniqueIDsInQuery.push(idString);
            }
        }
        if (sComparisonKeyValue[sComparisonKey] === "") {
            Log.trace("scomparison value is blank string");
            return false;                           // if value is a blank string
        }
        Log.trace("reached end of S comparison -> s comparison is valid");
        return true;
    }

    public static isOptionsValid(options: any, addedData: any, uniqueIDsInQuery: any[]): boolean {
        Log.trace("reached isOptionsValid");
        let optionsKeys: any[] = Object.keys(options);
        if (optionsKeys.length === 0 || optionsKeys.length > 2) {   // has to be 1 or 2 things in there (COL and ORDER)
            Log.trace("options key is 0 or more than 2");
            return false;
        }
        for (let optionsKey of optionsKeys) {
            if (!optionKeysAll.includes(optionsKey)) {         // options key is something other than COLUMNS or ORDER
                Log.trace("options key is something other than COLUMNS or ORDER");
                return false;
            }
        }
        if (!("COLUMNS" in options)) {                      // COLUMNS must be present
            Log.trace("COLUMNS is absent");
            return false;
        }
        let columnsValues: any[] = options["COLUMNS"];
        if (!this.checkColumnsValid(columnsValues, addedData, uniqueIDsInQuery)) {       // check if COLUMNS is valid
            Log.trace("COLUMNS is not valid");
            return false;
        }
        if ("ORDER" in options) {
            Log.trace("ORDER is present");
            let orderValue: any = options["ORDER"];
            if (!this.checkOrderValid(orderValue, columnsValues, addedData, uniqueIDsInQuery)) {    // check if OPTIONS
                Log.trace("ORDER is not valid");
                return false;
            }
        }
        return true;
    }

    public static checkColumnsValid(columnsValues: any[], addedData: any, uniqueIDsInQuery: any[]): boolean {
        Log.trace("Reached checkColumnsValid");
        if (columnsValues.length === 0 || !Array.isArray(columnsValues)) {      // must be non-empty array
            Log.trace("COLUMNS value has nothing in it or is not in array");
            return false;
        }
        for (let columnsValue of columnsValues) {               // each thing in array must be a string
            if (typeof columnsValue !== "string") {
                Log.trace("COLUMN value is not a string");
                return false;
            }
            let attributeField: string = columnsValue.split("_")[1];   // keyField must match one of above
            if (!sKeysMKeysAll.includes(attributeField)) {
                Log.trace("attribute field part is not one of the given ones");
                return false;
            }
            let idString: string = columnsValue.split("_")[0];
            if (!(idString in addedData)) {                            // id not found in added data sets
                Log.trace("idstring in COLUMNS key is not in our added datasets");
                return false;
            } else {
                Log.trace("idstring in COLUMNS key is found in our added datasets");
                if (!uniqueIDsInQuery.includes(idString)) {    // if id isn't already in query set of ids, add it
                    Log.trace("idstring in COLUMNS is not yet added in our list of query IDs --> add it");
                    uniqueIDsInQuery.push(idString);
                }
            }
        }
        return true;
    }

    public static checkOrderValid(orderValue: any, columnsValues: any[], addedData: any, uniqueIDsInQuery: any[]):
        boolean {
        Log.trace("Reached checkOrderValid");
        if (orderValue === null || typeof orderValue !== "string") {        // order type must be a string
            Log.trace("ORDER value is not a string");
            return false;
        }
        let attributeField: string = orderValue.split("_")[1];   // keyField must match one of above
        if (!sKeysMKeysAll.includes(attributeField)) {
            Log.trace("ORDER attribute field in not one of given strings");
            return false;
        }
        let idString: string = orderValue.split("_")[0];
        if (!(idString in addedData)) {                                    // id not found in added data sets
            Log.trace("idString in ORDER is not found in our added datasets");
            return false;
        } else {
            Log.trace("idString in ORDER is found in our added datasets");
            if (!uniqueIDsInQuery.includes(idString)) {        // if id isn't already in query set of ids, add it
                Log.trace("idString is not already in our list of unique query IDs -> add it");
                uniqueIDsInQuery.push(idString);
            }
        }
        for (let columnsValue of columnsValues) {       // order string has to match at least one of the column strings
            if (orderValue === columnsValue) {
                Log.trace("ORDER value matches one of the ones in COLUMNS - valid");
                return true;
            }
        }
        Log.trace("ORDER value did not match one of the ones in COLUMNS - invalid");
        return false;                                   // if by end none match, return false
    }
}
