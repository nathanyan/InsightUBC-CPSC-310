import Log from "../Util";
import {Decimal} from "decimal.js";

let mKeyFieldsAll: string[] = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
let sKeysMKeysAll: string[] = ["dept", "id", "instructor", "title", "uuid", "fullname", "shortname", "number"
    , "name", "address", "type", "furniture", "href", "avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
let transformationKeysAll: string[] = ["GROUP", "APPLY"];
let applyTokensAll: string[] = ["MAX", "MIN", "AVG", "COUNT", "SUM"];

export default class PerformQueryTransformations {

    public static isTransformationsValid(transformations: any, addedData: any, uniqueIDsInQuery: any[],
                                         applyKeysInQuery: any[], groupKeysInQuery: any[]): boolean {
        let transKeys: any[] = Object.keys(transformations);
        if (transKeys.length !== 2) {               // has to be exactly 2 keys
            return false;
        }
        if (!("GROUP" in transformations) || !("APPLY" in transformations)) {   // has to have GROUP and APPLY
            return false;
        }
        for (let transKey of transKeys) {
            if (!transformationKeysAll.includes(transKey)) {     // trans key is something other than GROUP or APPLY
                return false;
            }
        }
        let group: any[] = transformations["GROUP"];
        if (!this.checkGroupValid(group, addedData, uniqueIDsInQuery, groupKeysInQuery)) {    // check if GROUP is valid
            return false;
        }
        let apply: any[] = transformations["APPLY"];
        if (!this.checkApplyValid(apply, addedData, uniqueIDsInQuery, applyKeysInQuery)) {    // check if APPLY is valid
            return false;
        }
        return true;
    }

    public static checkGroupValid(group: any[], addedData: any, uniqueIDsInQuery: any[],
                                  groupKeysInQuery: any[]): boolean {
        if (group === null || group === undefined || group.length === 0 || !Array.isArray(group)) {
            return false;                                       // must be non-empty array
        }
        for (let groupKey of group) {               // each thing in array must be a string
            if (typeof groupKey !== "string") {
                return false;
            }
            let attributeField: string = groupKey.split("_")[1];   // key field must match one of above
            if (!sKeysMKeysAll.includes(attributeField)) {
                return false;
            }
            let idString: string = groupKey.split("_")[0];
            if (!(idString in addedData)) {                            // id not found in added data sets
                return false;
            } else {
                if (!uniqueIDsInQuery.includes(idString)) {    // if id isn't already in query set of ids, add it
                    uniqueIDsInQuery.push(idString);
                }
            }
            groupKeysInQuery.push(groupKey);
        }
        return true;
    }

    public static checkApplyValid(apply: any[], addedData: any, uniqueIDsInQuery: any[],
                                  applyKeysInQuery: any[]): boolean {
        if (apply === null || apply === undefined || !Array.isArray(apply)) {
            return false;                                       // must be array, can be empty
        }
        if (apply.length === 0) {
            return true;
        }
        for (let applyRule of apply) {          // checking applyRule object
            if (applyRule === null || typeof applyRule !== "object" || typeof applyRule === "string"
                || applyRule === undefined || Array.isArray(applyRule)) {
                return false;                   // must be an object
            }
            let applyKeys: any[] = Object.keys(applyRule);
            if (applyKeys.length !== 1) {                   // has to be just 1 object within the applyRule
                return false;
            }
            let applyKey: any = applyKeys[0];
            if (typeof applyKey !== "string" || applyKey.includes("_")) {         // applyKey must be string with no "_"
                return false;
            }
            if (applyKeysInQuery.includes(applyKey)) {
                return false;               // applyKey is not unique - already shows up in previous applyRule
            } else {
                applyKeysInQuery.push(applyKey);        // applyKey is unique - add it to list of unique keys
            }
            let applyTokenAndKeyObject: any = applyRule[applyKey];      // object for applyKey
            if (!this.checkApplyTokenKeyObject(applyTokenAndKeyObject, addedData, uniqueIDsInQuery)) {
                return false;                       // check the object within applyRule
            }
        }
        return true;                    // no EBNF broken in any of the applyRules
    }

    public static checkApplyTokenKeyObject(applyTokenAndKeyObject: any, addedData: any,
                                           uniqueIDsInQuery: any[]): boolean {
        if (applyTokenAndKeyObject === null || typeof applyTokenAndKeyObject !== "object"
            || typeof applyTokenAndKeyObject === "string" || applyTokenAndKeyObject === undefined
            || Array.isArray(applyTokenAndKeyObject)) {
            return false;           // must be an object associated with applyKey
        }
        let applyTokens: any[] = Object.keys(applyTokenAndKeyObject);
        if (applyTokens.length !== 1) {              // object must have 1 apply token string as key
            return false;
        }
        let applyToken = applyTokens[0];
        if (typeof applyToken !== "string") {
            return false;                   // applyTokenKey is not a string
        }
        if (!applyTokensAll.includes(applyToken)) {
            return false;                   // apply token is not one of pre-set options above
        }
        let key: any = applyTokenAndKeyObject[applyToken];      // key associated with Apply Token
        if (typeof key !== "string") {
            return false;
        }
        let attributeField: string = key.split("_")[1];   // key field must match one of above
        if (applyToken === "MAX" || applyToken === "MIN" || applyToken === "SUM" || applyToken === "AVG") {
            if (!mKeyFieldsAll.includes(attributeField)) {
                return false;                           // MAX MIN AVG SUM not associated with an mKey
            }
        }
        if (!sKeysMKeysAll.includes(attributeField)) {
            return false;
        }
        let idString: string = key.split("_")[0];
        if (!(idString in addedData)) {                            // id not found in added data sets
            return false;
        } else {
            if (!uniqueIDsInQuery.includes(idString)) {    // if id isn't already in query set of ids, add it
                uniqueIDsInQuery.push(idString);
            }
        }
        return true;                    // object with {applyToken : key} is valid
    }

    public static groupAndApply(resultSoFar: any[], transformations: any): any[] {
        let groupKeys: any[] = transformations["GROUP"];
        let applyRules: any[] = transformations["APPLY"];
        let resultGroupings: any[] = this.groupResults(resultSoFar, groupKeys);
        if (applyRules.length !== 0) {
            resultGroupings = this.applyTransformations(resultGroupings, applyRules);
        }
        return resultGroupings;
    }

    public static groupResults(resultSoFar: any[], groupKeys: any[]): any[] {
        let groupedResults: any[] = [];                 // array of {} objects
        for (let courseSection of resultSoFar) {
            if (groupedResults.length <= 5000) {            // as long as <= 5000 groups, keep adding
                let isNewGroup: boolean = true;
                if (groupedResults.length !== 0) {         // if not empty, iterate through groups to see if one matches
                    for (let grouping of groupedResults) {
                        if (this.checkIfMatchesGroup(grouping, groupKeys, courseSection)) {
                            isNewGroup = false;    // courseSection found a matching existing group, set isNewGroup to F
                            break;
                        }
                    }
                }
                if (isNewGroup) {
                    let uniqueGroup: any = {};                          // create new object
                    for (let groupKey of groupKeys) {
                        if (courseSection[groupKey] === "") {
                            uniqueGroup[groupKey] = "";
                        } else {
                            uniqueGroup[groupKey] = courseSection[groupKey];  // create key-value pair to identify group
                        }
                    }
                    uniqueGroup["Course Sections"] = [];                // Course sections matching group criteria
                    uniqueGroup["Course Sections"].push(courseSection); // add the member to it
                    groupedResults.push(uniqueGroup);              // add the group object to array of all unique groups
                } else {
                    for (let grouping of groupedResults) {
                        if (this.checkIfMatchesGroup(grouping, groupKeys, courseSection)) { // if find a matching group
                            grouping["Course Sections"].push(courseSection);    // add to Course Sections array
                        }
                    }
                }
            } else {            // 5001 or more groups, just return result back so ResultTooLarge can be returned
                return groupedResults;
            }
        }
        return groupedResults;
    }

    public static checkIfMatchesGroup(grouping: any, groupKeys: any[], courseSection: any): boolean {
        for (let groupKey of groupKeys) {
            if (grouping[groupKey] !== courseSection[groupKey]) {
                return false;    // groupKey's value in courseSection is different from the value identifier in grouping
            }
        }
        return true;      // went through all groupKeys; all values in grouping corresponding to values in courseSection
    }

    public static applyTransformations(resultGroupings: any[], applyRules: any[]): any[] {
        let resultAfterApply: any[] = resultGroupings;
        for (let applyRule of applyRules) {                     // Perform applyRule on results list one at a time
            resultAfterApply = this.addApplyRule(resultAfterApply, applyRule);
        }
        return resultAfterApply;
    }

    public static addApplyRule(resultGroupings: any[], applyRule: any): any[] {
        let applyKeys: any[] = Object.keys(applyRule);
        let applyKey: any = applyKeys[0];
        let applyTokenKeyObject: any = applyRule[applyKey];
        let applyTokens: any[] = Object.keys(applyTokenKeyObject);
        let applyToken: any = applyTokens[0];
        let tokenField: any = applyTokenKeyObject[applyToken];
        for (let group of resultGroupings) {                // for each group in result list, check Token
            if (applyToken === "MIN") {
                group = this.applyMin(applyKey, group, tokenField);
            }
            if (applyToken === "MAX") {
                group = this.applyMax(applyKey, group, tokenField);
            }
            if (applyToken === "SUM") {
                group = this.applySum(applyKey, group, tokenField);
            }
            if (applyToken === "AVG") {
                group = this.applyAvg(applyKey, group, tokenField);
            }
            if (applyToken === "COUNT") {
                group = this.applyCount(applyKey, group, tokenField);
            }
        }
        return resultGroupings;
    }

    public static applyMin(applyKey: any, group: any, tokenField: any): any {
        let courseSections: any[] = group["Course Sections"];
        let min: number = Number.MAX_VALUE;
        for (let courseSection of courseSections) {
            if (courseSection[tokenField] < min) {
                min = courseSection[tokenField];
            }
        }
        group[applyKey] = min;
        return group;
    }

    public static applyMax(applyKey: any, group: any, tokenField: any): any {
        let courseSections: any[] = group["Course Sections"];
        let max: number = Number.MIN_VALUE;
        for (let courseSection of courseSections) {
            if (courseSection[tokenField] > max) {
                max = courseSection[tokenField];
            }
        }
        group[applyKey] = max;
        return group;
    }

    public static applySum(applyKey: any, group: any, tokenField: any): any {
        let courseSections: any[] = group["Course Sections"];
        let sum: number = 0;
        for (let courseSection of courseSections) {
            sum = sum + courseSection[tokenField];
        }
        sum = Number(sum.toFixed(2));
        group[applyKey] = sum;
        return group;
    }

    public static applyAvg(applyKey: any, group: any, tokenField: any): any {
        let courseSections: any[] = group["Course Sections"];
        let total: Decimal = new Decimal(0);
        for (let courseSection of courseSections) {
            let decimalValue = new Decimal(courseSection[tokenField]);
            total = total.add(decimalValue);
        }
        let avg: any = total.toNumber() / courseSections.length;
        let res: number = Number(avg.toFixed(2));
        group[applyKey] = res;
        return group;
    }

    public static applyCount(applyKey: any, group: any, tokenField: any): any {
        let courseSections: any[] = group["Course Sections"];
        let listOfUnique: any[] = [];
        for (let courseSection of courseSections) {
            if (!(listOfUnique.includes(courseSection[tokenField]))) {
                listOfUnique.push(courseSection[tokenField]);
            }
        }
        let totalUnique: number = listOfUnique.length;
        group[applyKey] = totalUnique;
    }
}
