/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */

//import Log from "../../src/Util";

let mKeyFieldsCourses = ["avg", "pass", "fail", "audit", "year"];
let mKeyFieldsRooms = ["lat", "lon", "seats"];
let sKeyFieldsCourses = ["dept", "id", "instructor", "title", "uuid"];

CampusExplorer.buildQuery = function () {
    let query = {};
    //Log.trace("buildQuery start");
    let dataID;
    let coursesTab = document.querySelector("nav.nav a[data-type='courses']");
    let roomsTab = document.querySelector("nav.nav a[data-type='rooms']");
    // let coursesTab = document.getElementsByClassName("nav-item tab")[0];
    // let roomsTab = document.getElementsByClassName("nav-item tab")[1];
    if (coursesTab.getAttribute("class") === "nav-item tab active") {
        dataID = "courses_";
    }
    if (roomsTab.getAttribute("class") === "nav-item tab active") {
        dataID = "rooms_";
    }
    let where = {};
    let options = {};
    let columns = [];
    let order = "";
    let transformations = {};
    let group = [];
    let apply = [];
    where = buildWhere(dataID);
    query["WHERE"] = where;
    // options["COLUMNS"] = [];
    // query["OPTIONS"] = options;
    return query;
};

function buildWhere(dataID) {
    let where = {};
    let formElement;
    let listOfConditions;
    if (dataID === "courses_") {
        formElement = document.querySelector("form[data-type='courses']");
        listOfConditions = formElement.getElementsByClassName("control-group condition");
    }
    if (dataID === "rooms_") {
        formElement = document.querySelector("form[data-type='rooms']");
        listOfConditions = formElement.getElementsByClassName("control-group condition");
    }
    //let listOfConditions = document.getElementsByClassName("control-group condition");
    if (listOfConditions.length === 0) {
        return where;
    }
    //if (dataID === "courses_") {        // data to query = courses
        let whereFiltersOrAnd = [];
        for (let controlGroupCondition of listOfConditions) {
            //let controlGroupCondition = listOfConditions[i];
            let comparisonKeyElement = controlGroupCondition.querySelector("div.control.operators option[selected='selected']");
            let comparisonKey = comparisonKeyElement.getAttribute("value");  // IS EQ GT LT
            let comparisonAttributeElement = controlGroupCondition.querySelector("div.control.fields option[selected='selected']");
            let comparisonAttributeSkeyMkey = comparisonAttributeElement.getAttribute("value");
            let comparisonAttribute = dataID + comparisonAttributeSkeyMkey;   // courses_audit courses_pass etc
            let comparisonInputElement = controlGroupCondition.querySelector("div.control.term input[type='text']");
            let comparisonInput = comparisonInputElement.getAttribute("value");     // "cpsc" 90 etc
            if (mKeyFieldsCourses.includes(comparisonAttributeSkeyMkey) || mKeyFieldsRooms.includes(comparisonAttributeSkeyMkey)) {
                comparisonInput = Number(comparisonInput);      // input should be a number instead of string
            }
            let comparisonObject = {};
            comparisonObject[comparisonAttribute] = comparisonInput;    // { "courses_fail" : 20 }
            let notElement = controlGroupCondition.querySelector("div.control.not input");
            if (notElement.getAttribute("checked") === "checked") {     // not checkbox selected
                let notObject = {};
                notObject[comparisonKey] = comparisonObject;    //  { "GT" : { "courses_fail" : 20 } }
                if (listOfConditions.length === 1) {    // only 1 condition, put directly into WHERE
                    where["NOT"] = notObject;           // { "NOT" : { "GT" : { "courses_fail" : 20 } } }
                    return where;
                } else {                                // more than 1 condition, put into array
                    let notObject2 = {};
                    notObject2["NOT"] = notObject;      // { "NOT" : { "GT" : { "courses_fail" : 20 } } }
                    whereFiltersOrAnd.push(notObject2);
                }
            } else {                                                            // not checkbox isn't selected
                if (listOfConditions.length === 1) {            // only 1 condition, put directly into WHERE
                    where[comparisonKey] = comparisonObject;    //  { "GT" : { "courses_fail" : 20 } }
                    return where;
                } else {                                        // more than 1 condition, put into array
                    let conditionObject = {};
                    conditionObject[comparisonKey] = comparisonObject;  //  { "GT" : { "courses_fail" : 20 } }
                    whereFiltersOrAnd.push(conditionObject);
                }
            }
        }
        if (dataID === "courses_") {
            let coursesConditionAllElement = document.getElementById("courses-conditiontype-all");
            let coursesConditionAnyElement = document.getElementById("courses-conditiontype-any");
            let coursesConditionNoneElement = document.getElementById("courses-conditiontype-none");
            if (coursesConditionAllElement.getAttribute("checked") === "checked") {
                where["AND"] = whereFiltersOrAnd;
            }
            if (coursesConditionAnyElement.getAttribute("checked") === "checked") {
                where["OR"] = whereFiltersOrAnd;
            }
            if (coursesConditionNoneElement.getAttribute("checked") === "checked") {
                let notObjectMany = {};
                notObjectMany["OR"] = whereFiltersOrAnd;
                where["NOT"] = notObjectMany;
            }
        }
        if (dataID === "rooms_") {
            let roomsConditionAllElement = document.getElementById("rooms-conditiontype-all");
            let roomsConditionAnyElement = document.getElementById("rooms-conditiontype-any");
            let roomsConditionNoneElement = document.getElementById("rooms-conditiontype-none");
            if (roomsConditionAllElement.getAttribute("checked") === "checked") {
                where["AND"] = whereFiltersOrAnd;
            }
            if (roomsConditionAnyElement.getAttribute("checked") === "checked") {
                where["OR"] = whereFiltersOrAnd;
            }
            if (roomsConditionNoneElement.getAttribute("checked") === "checked") {
                let notObjectMany = {};
                notObjectMany["OR"] = whereFiltersOrAnd;
                where["NOT"] = notObjectMany;
            }
        }
        return where;
}
