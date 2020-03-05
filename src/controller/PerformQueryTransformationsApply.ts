import Log from "../Util";
import {Decimal} from "decimal.js";

export default class PerformQueryTransformationsApply {

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
