import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, ResultTooLargeError} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";

let queryKeysAll: string[] = ["WHERE", "OPTIONS"];
let filterKeysAll: string[] = ["GT", "LT", "EQ", "IS", "NOT", "AND", "OR"];
let mKeyFieldsAll: string[] = ["avg", "pass", "fail", "audit", "year"];
let sKeyFieldsAll: string[] = ["dept", "id", "instructor", "title", "uuid"];
let sKeysMKeysAll: string[] = ["dept", "id", "instructor", "title", "uuid", "avg", "pass", "fail", "audit", "year"];
let optionKeysAll: string[] = ["COLUMNS", "ORDER"];

export default class PerformQueryFilterDisplay {

    public static filterCourseSections(datasetToParse: any[], filter: any): any[] {
        let resultSoFar: any[] = [];
        let filterKeys: any[] = Object.keys(filter);
        if (filterKeys.length === 0) {          // WHERE is empty, return whole dataset as result
            return datasetToParse;
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
        return resultSoFar;
    }

    public static ltComparison(datasetToParse: any[], filterKV: any): any[] {
        let result: any[] = [];
        let courseAttribute: any = Object.keys(filterKV)[0];
        let courseValue: number = filterKV[courseAttribute];
        for (let courseSection of datasetToParse) {
            if (courseSection[courseAttribute] < courseValue) { // each course section with attribute less than
                result.push(courseSection);                     // the filter's number will get added to resultSoFar
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
                result.push(courseSection);                         // the filter's number will get added to resultSoFar
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
                result.push(courseSection);                         // the filter's number will get added to resultSoFar
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
