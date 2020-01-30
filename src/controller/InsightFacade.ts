import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import * as JSZip from "jszip";
import * as fs from "fs";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    private addedData: any;
    private zip: JSZip;

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.zip = new JSZip();
        this.addedData = {};
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        // open data, read data, dump it somewhere, write it to disk
        // So the steps of addDataset are sth along line of: check for validity of the zip file -> read the zip if so
        // -> parse -> save to disk
        let promisesList: Array<Promise<any>> = [];
        return new Promise((resolve, reject) => {
            if (!this.checkValidId(id)) {
                reject(InsightError);
            } else {
                this.zip.loadAsync(content, {base64: true}).then((zip2) => {
                    // read each file individually (loop over array) which are jsons -> call async on each object ,
                    // when promise resolves gives back string
                    // load each file, gives back promise, accumulate these promises in an array ->
                    // pass array to promise.all ->
                    // .then () gives result which is array of strings (of files) then you can iterate over this

                    let folder = zip2.folder("courses");

                    Object.values(folder.files).forEach((file) => {
                        promisesList.push(file.async("text"));
                    });

                    Promise.all(promisesList).then((resultFiles: string[]) => {
                        let data: JSON[] = [];
                        resultFiles.forEach((object: string) => {
                            let jsonifiedFile: JSON;
                            try {
                                jsonifiedFile = this.convertToJSON(object);
                            } catch {
                                return;
                            }
                            this.checkValidFile(jsonifiedFile, id, data);
                        });
                        if (data.length !== 0) {
                            // push data to memory
                            let filesToWrite: string[] = [];
                            this.addedData[id] = data;
                            // stringify and write to disk
                            for (let jsonFile of data) {
                                let stringifiedFile = JSON.stringify(jsonFile);
                                filesToWrite.push(stringifiedFile);
                            }

                            try {
                                fs.writeFileSync("C:\\Users\\Yuree\\github-310\\project_team020\\data", filesToWrite);
                            } catch (InsightError) {
                                Log.trace(InsightError);
                            }
                        }
                    }).catch((err: InsightError) => {
                        return err;
                    });
                }).catch((err: InsightError) => {
                    return err;
                });
                resolve(Object.keys(this.addedData));
            }
        });
    }

    private convertToJSON(folder: string): any {
        return JSON.parse(folder);
    }

    private checkValidId(id: string): boolean {
        if (id.length === 0 || typeof id !== "string" || /^\s*$/.test(id)) {
            return false;
        }
        if (id.includes("_")) {
            return false;
        }
        for (let otherIds in Object.keys(this.addedData)) {
            if (otherIds === id) {return false; }
        }
        // check to see what's on disk, use fs readd dir sync to get back an array of strings that are filenames ->
        // parse these filenames and compare to id names
        if (!fs.existsSync("C:\\Users")) {
            Log.trace("No directory");
        }
        fs.readdirSync("C:\\Users\\Yuree\\github-310\\project_team020\\data").forEach((file: string) => {
            let fileName = file.substr(0, file.lastIndexOf("."));
            if (fileName === id) {return false; }
        });
        return true;
    }

    private checkValidFile(file: any, id: string, data: JSON[]) {
        if (file === null) {
            return;
        }
        if (file === undefined) {
            return;
        }

        if (file["result"] === undefined) {
            return;
        } else {
        let targetKeys = ["Subject", "Course", "Avg", "Professor", "Title", "Pass", "Fail", "Audit", "Year", "id"];
        let formattedKeys: any = {};
        let result: any[] = file["result"];
        result.forEach((oneObject: any) => {
            if (oneObject["Section"] === undefined) {
                return ;
            }
            this.setKeyValues(formattedKeys, targetKeys, id, oneObject);
            if (this.checkKeysComplete(formattedKeys)) {
                data.push(formattedKeys);
                return;
            }
        });
        }
    }

    private setKeyValues(formattedKeys: any, targetKeys: string[], id: string, oneObject: any) {
        targetKeys.forEach((key: any) => {
            if (oneObject[key] === undefined) {
                return;
            }
            if (key === "Subject" && typeof oneObject[key] === "string") {
                formattedKeys[id + "_dept"] = oneObject[key];
            }
            if (key === "Course" && typeof oneObject[key] === "string") {
                formattedKeys[id + "_id"] = oneObject[key];
            }
            if (key === "Title" && typeof oneObject[key] === "string") {
                formattedKeys[id + "_" + key.toLowerCase()] = oneObject[key];
            }
            if (key === "Professor" && typeof oneObject[key] === "string") {
                formattedKeys[id + "_instructor"] = oneObject[key];
            }
            if (key === "id" && typeof oneObject[key] === "string") {
                formattedKeys[id + "_uuid"] = oneObject[key];
            }
            if (key === "Year" && typeof oneObject[key] === "number") {
                if (oneObject["Section"] === "overall") {
                    formattedKeys[id + "_" + key.toLowerCase()] = 1900;
                }
                formattedKeys[id + "_" + key.toLowerCase()] = oneObject[key];
            }
            if (key === "Avg" && typeof oneObject[key] === "number") {
                formattedKeys[id + "_" + key.toLowerCase()] = oneObject[key];
            }
            if (key === "Pass" && typeof oneObject[key] === "number") {
                formattedKeys[id + "_" + key.toLowerCase()] = oneObject[key];
            }
            if (key === "Fail" && typeof oneObject[key] === "number") {
                formattedKeys[id + "_" + key.toLowerCase()] = oneObject[key];
            }
            if (key === "Audit" && typeof oneObject[key] === "number") {
                formattedKeys[id + "_" + key.toLowerCase()] = oneObject[key];
            }
        });
    }

    private checkKeysComplete(formattedKeys: any): boolean {
        if (formattedKeys["courses_dept"] !== undefined && formattedKeys["courses_id"] !== undefined &&
            formattedKeys["courses_avg"] !== undefined && formattedKeys["courses_instructor"] !== undefined &&
            formattedKeys["courses_title"] !== undefined && formattedKeys["courses_pass"]
            && formattedKeys["courses_fail"] !== undefined && formattedKeys["courses_audit"] !== undefined
            && formattedKeys["courses_uuid"] !== undefined && formattedKeys["courses_year"] !== undefined) {
            return true;
        }
        return false;
    }

    public removeDataset(id: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.checkValidIdToRemove(id)) {
                reject(InsightError);
            }
            if (!this.checkIdExists(id)) {
                reject(NotFoundError);
            }
            fs.readdirSync("C:\\Users\\Yuree\\github-310\\project_team020\\data").forEach((file: string) => {
                let fileName = file.substr(0, file.lastIndexOf("."));
                if (fileName === id) {
                    fs.unlink(file, (err) => {
                        if (err) {throw err; }
                        Log.trace("data with id was deleted");
                    });
                }
            });
            delete this.addedData[id];
            resolve(id);
        });
    }

    public performQuery(query: any): Promise <any[]> {
        return Promise.reject("Not implemented.");
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return new Promise((resolve) => {
            let currentDatasets: InsightDataset[] = [];
            let allData: string[] = Object.keys(this.addedData);
            allData.forEach((key: string) => {
                let dataValues: any = {};
                dataValues["id"] = key;
                dataValues["numRows"] = allData.length;
                dataValues["kind"] = InsightDatasetKind.Courses;
                currentDatasets.push(dataValues);
            });
            resolve(currentDatasets);
        });
    }

    private checkValidIdToRemove(id: string) {
        if (id.length === 0 || typeof id !== "string" || /^\s*$/.test(id)) {
            return false;
        }
        if (id.includes("_")) {
            return false;
        }
        for (let otherIds in Object.keys(this.addedData)) {
            if (otherIds === id) {return false; }
        }
        return true;
    }

    private checkIdExists(id: string): boolean {
        for (let existingIds of Object.keys(this.addedData)) {
            if (existingIds === id) {
                return true;
            }
        }
        fs.readdirSync("C:\\Users\\Yuree\\github-310\\project_team020\\data").forEach((file: string) => {
            let fileName = file.substr(0, file.lastIndexOf("."));
            if (fileName === id) {return true; }
        });
        return false;
    }
}
