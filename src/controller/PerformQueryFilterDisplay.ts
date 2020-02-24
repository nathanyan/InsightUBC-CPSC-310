import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, ResultTooLargeError} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";

let queryKeysAll: string[] = ["WHERE", "OPTIONS"];
let filterKeysAll: string[] = ["GT", "LT", "EQ", "IS", "NOT", "AND", "OR"];
let mKeyFieldsAll: string[] = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
let sKeyFieldsAll: string[] = ["dept", "id", "instructor", "title", "uuid", "fullname", "shortname", "number"
    , "name", "address", "type", "furniture", "href"];
let sKeysMKeysAll: string[] = ["dept", "id", "instructor", "title", "uuid", "fullname", "shortname", "number"
    , "name", "address", "type", "furniture", "href", "avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
let optionKeysAll: string[] = ["COLUMNS", "ORDER"];
let transformationKeysAll: string[] = ["GROUP", "APPLY"];
let applyTokensAll: string[] = ["MAX", "MIN", "AVG", "COUNT", "SUM"];

export default class PerformQueryFilterDisplay {

    public static filterCourseSections(datasetToParse: any[], filter: any): any[] {
        let resultSoFar: any[] = [];
        let filterKeys: any[] = Object.keys(filter);
        if (filterKeys === null || filterKeys.length === 0) {          // WHERE is empty, return whole dataset as result
            for (let courseSection of datasetToParse) {
                resultSoFar.push(courseSection);
            }
            return resultSoFar;
        }
        let filterKey: any = filterKeys[0];     // the 1st level filter key
        let filterKV: any = filter[filterKey];  // the filter object associated with this first filter key
        if (filterKey === "LT") {       // grab sections with key attribute less than value
            resultSoFar = this.ltComparison(datasetToParse, filterKV);
        }
        if (filterKey === "EQ") {       // grab sections with key attribute equal to value
            resultSoFar = this.eqComparison(datasetToParse, filterKV);
        }
        if (filterKey === "GT") {       // grab sections with key attribute greater than value
            resultSoFar = this.gtComparison(datasetToParse, filterKV);
        }
        if (filterKey === "IS") {       // grab sections with key attribute matching given string
            resultSoFar = this.isComparison(datasetToParse, filterKV);
        }
        if (filterKey === "NOT") {
            resultSoFar = this.negationLogic(datasetToParse, filterKV);
        }
        if (filterKey === "AND") {
            resultSoFar = this.andLogic(datasetToParse, filterKV);
        }
        if (filterKey === "OR") {
            resultSoFar = this.orLogic(datasetToParse, filterKV);
        }
        return resultSoFar;
    }

    public static ltComparison(datasetToParse: any[], filterKV: any): any[] {
        let result: any[] = [];
        let courseAttribute: any = Object.keys(filterKV)[0];
        let courseValue: number = filterKV[courseAttribute];
        for (let courseSection of datasetToParse) {
            if (courseSection[courseAttribute] < courseValue) { // each course section with attribute less than
                result.push(courseSection);
            }
        }
        return result;
    }

    public static eqComparison(datasetToParse: any[], filterKV: any): any[] {
        let result: any[] = [];
        let courseAttribute: any = Object.keys(filterKV)[0];
        let courseValue: number = filterKV[courseAttribute];
        for (let courseSection of datasetToParse) {
            if (courseSection[courseAttribute] === courseValue) {   // each course section with attribute equal to
                result.push(courseSection);
            }
        }
        return result;
    }

    public static gtComparison(datasetToParse: any[], filterKV: any): any[] {
        let result: any[] = [];
        let courseAttributeKeys: any[] = Object.keys(filterKV);
        let courseAttributeKey: any = courseAttributeKeys[0];
        let courseValue: number = filterKV[courseAttributeKey];
        for (let courseSection of datasetToParse) {
            if (courseSection[courseAttributeKey] > courseValue) {    // each course section with attribute greater than
                result.push(courseSection);
            }
        }
        return result;
    }

    public static isComparison(datasetToParse: any[], filterKV: any): any[] {
        let result: any[] = [];
        let courseAttributeKeys: any[] = Object.keys(filterKV);
        let courseAttributeKey: any = courseAttributeKeys[0];
        let stringToMatch: string = filterKV[courseAttributeKey];
        let stringLength: number = stringToMatch.length;
        if (stringToMatch.charAt(0) === "*" || stringToMatch.charAt(stringLength - 1) === "*") {
            result = this.stringWildcard(datasetToParse, stringToMatch, courseAttributeKey);    // has * = wildcard
        } else {
            for (let courseSection of datasetToParse) {
                if (courseSection[courseAttributeKey] === stringToMatch) {  // each course section that has exact string
                    result.push(courseSection);
                }
            }
        }
        return result;
    }

    public static stringWildcard(datasetToParse: any[], stringToMatch: string, courseAttributeKey: any): any[] {
        let result: any[] = [];
        if (stringToMatch === "*" || stringToMatch === "**") {
            for (let courseSection of datasetToParse) {
                result.push(courseSection);
            }
        }
        // only star at beginning
        if ((stringToMatch.charAt(0) === "*") && (!(stringToMatch.charAt(stringToMatch.length - 1) === "*"))) {
            let newStringToMatch: string = stringToMatch.substring(1);  // from 2nd letter to end
            let newStringLength: number = newStringToMatch.length;
            for (let courseSection of datasetToParse) {
                let stringValue: string = courseSection[courseAttributeKey];
                if (newStringToMatch === stringValue.substring(stringValue.length - newStringLength)) {
                    result.push(courseSection);     // last newStringLength characters match
                }
            }
        }
        // only star at the end
        if (!(stringToMatch.charAt(0) === "*") && (stringToMatch.charAt(stringToMatch.length - 1) === "*")) {
            let newStringToMatch: string = stringToMatch.substring(0, stringToMatch.length - 1);    // beg to 2nd last
            let newStringLength: number = newStringToMatch.length;
            for (let courseSection of datasetToParse) {
                let stringValue: string = courseSection[courseAttributeKey];
                if (newStringToMatch === stringValue.substring(0, newStringLength)) {
                    result.push(courseSection);         // the first newStringLength characters match
                }
            }
        }
        // star at beginning and end
        if ((stringToMatch.charAt(0) === "*") && (stringToMatch.charAt(stringToMatch.length - 1) === "*")) {
            let newStringToMatch: string = stringToMatch.substring(1, stringToMatch.length - 1);  // 2nd ltr to 2nd last
            for (let courseSection of datasetToParse) {
                let stringValue: string = courseSection[courseAttributeKey];
                if (stringValue.includes(newStringToMatch)) {
                    result.push(courseSection);     // entire substring is contained somewhere in course section string
                }
            }
        }
        return result;
    }

    public static negationLogic(datasetToParse: any[], filterKV: any[]): any[] {
        let result: any[] = [];
        let recurseResult: any[] = this.filterCourseSections(datasetToParse, filterKV); // filters the next deeper level
        for (let courseSection of datasetToParse) {
            if (!(recurseResult.includes(courseSection))) {         // pull out the opposite of we gathered so far
                result.push(courseSection);
            }
        }
        return result;
    }

    public static andLogic(datasetToParse: any[], filterKV: any[]): any[] {
        let result: any[] = datasetToParse;
        let andFilterKeys: any[] = Object.keys(filterKV);
        let andFilterKey: any = andFilterKeys[0];
        if (andFilterKeys.length === 1) {
            return this.filterCourseSections(result, andFilterKey);     // if only 1 in AND = just one filter
        }
        for (let andFilter of filterKV) {                   // recurse with result so that result gets further filtered
            result = this.filterCourseSections(result, andFilter);
        }
        return result;
    }

    public static orLogic(datasetToParse: any[], filterKV: any[]): any[] {
        let result: any[] = [];
        if (filterKV.length === 1) {
            result = this.filterCourseSections(datasetToParse, filterKV[0]);  // if only 1 in OR = just do one filter
        } else {
            for (let orFilter of filterKV) {
                let recurseResult: any[] = this.filterCourseSections(datasetToParse, orFilter); // do first filter in OR
                for (let eachRecurseResult of recurseResult) {
                    if (!(result.includes(eachRecurseResult))) {       // in results so far, if not present yet then add
                        result.push(eachRecurseResult);
                    }
                }
            }
        }
        return result;
    }

    public static displayByOptions(resultSoFar: any[], options: any): any[] {
        let finalResultUnordered: any[] = [];
        let columnsAttributes: any[] = options["COLUMNS"];
        let i: number;
        for (i = 0 ; i < resultSoFar.length ; i++) {           // each course section in resultSoFar-> create new object
            let sectionWithColumns: any = {};
            for (let attribute of columnsAttributes) {      // put each attribute with its value into object
                if (!(resultSoFar[i][attribute] === null) && (attribute in resultSoFar[i])
                    && !(resultSoFar[i][attribute] === "")) {
                    sectionWithColumns[attribute] = resultSoFar[i][attribute];
                }
            }
            let sectionWithColumnsKeys: any[] = Object.keys(sectionWithColumns);
            if (sectionWithColumnsKeys.length === columnsAttributes.length) {
                finalResultUnordered.push(sectionWithColumns);  // once all attribute-key-values are in, push to final
            }
        }
        let finalResultOrdered: any[] = [];
        if ("ORDER" in options) {                   // if there is an ORDER -> sort by the value in ORDER
            let displayOrder: any = options["ORDER"];
            if (displayOrder !== null && typeof displayOrder === "string" && displayOrder !== "") {
                finalResultOrdered = finalResultUnordered.sort((x, y) => {
                    if (x[displayOrder] > y[displayOrder]) {
                        return 1;
                    }
                    if (x[displayOrder] < y[displayOrder]) {
                        return -1;
                    }
                    return 0;
                });
            }
            return finalResultOrdered;      // return ordered result if ORDER is present
        } else {
            return finalResultUnordered;    // return unordered result if no ORDER present
        }
    }
}
