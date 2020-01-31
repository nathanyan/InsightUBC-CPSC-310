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
        // let data: Buffer = fs.readFileSync("./data/");
        // let dataToAdd:  = JSON.parse(data);
        this.addedData = {};
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        // open data, read data, dump it somewhere, write it to disk
        // So the steps of addDataset are sth along line of: check for validity of the zip file -> read the zip if so
        // -> parse -> save to disk
        let promisesList: Array<Promise<any>> = [];
        return new Promise((resolve, reject) => {
            if (!this.checkValidId(id)) {
                reject(new InsightError());
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
                            try {
                                let jsonifiedFile: JSON = this.convertToJSON(object);
                                this.checkValidFile(jsonifiedFile, id, data);
                            } catch {
                                return;
                            }
                        });
                        if (data.length !== 0) {
                            // push data to memory
                            // let filesToWrite: string[] = [];
                            this.addedData[id] = data;
                            // stringify and write to disk
                            // for (let jsonFile of data) {
                            let stringifiedFile = JSON.stringify(this.addedData);
                                // filesToWrite.push(stringifiedFile);
                            // }

                            try {
                                fs.writeFileSync("./data/cache", stringifiedFile);
                            } catch (e) {
                                Log.trace("write before");
                                reject(new InsightError());
                            }
                        }
                        resolve(Object.keys(this.addedData));
                    }).catch((err: any) => {
                        Log.trace(err);
                        reject(new InsightError());
                    });
                }).catch((err: any) => {
                    Log.trace(err);
                    reject(new InsightError());
                });
            }
        });
    }

    private convertToJSON(file: string): any {
        return JSON.parse(file);
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
        result.forEach((section: any) => {
            // if (section["Section"] === undefined) {
            //     return;
            // }
            this.setKeyValues(formattedKeys, targetKeys, id, section);
            if (this.checkKeysComplete(formattedKeys, id)) {
                data.push(formattedKeys);
                return;
            }
        });
        }
    }

    private setKeyValues(formattedKeys: any, targetKeys: string[], id: string, section: any) {
        for (let key of targetKeys) {
            if (section["Section"] === undefined) {
                return;
            }
            if (section[key] === undefined) {
                return;
            }
            if (key === "Subject") {
                formattedKeys[id + "_dept"] = section[key].toString();
            }
            if (key === "Course") {
                formattedKeys[id + "_id"] = section[key].toString();
            }
            if (key === "Title") {
                formattedKeys[id + "_" + key.toLowerCase()] = section[key].toString();
            }
            if (key === "Professor") {
                formattedKeys[id + "_instructor"] = section[key].toString();
            }
            if (key === "id") {
                formattedKeys[id + "_uuid"] = section[key].toString();
            }
            if (key === "Year") {
                if (section["Section"] === "overall") {
                    formattedKeys[id + "_" + key.toLowerCase()] = 1900;
                } else if (typeof section[key] === "number") {
                    formattedKeys[id + "_" + key.toLowerCase()] = parseFloat(section[key]);
                    if (isNaN(formattedKeys[id + "_" + key.toLowerCase()])) {return; }
                }
            }
            if (key === "Avg") {
                formattedKeys[id + "_" + key.toLowerCase()] = parseFloat(section[key]);
                if (isNaN(formattedKeys[id + "_" + key.toLowerCase()])) {return; }
            }
            if (key === "Pass") {
                formattedKeys[id + "_" + key.toLowerCase()] = parseFloat(section[key]);
                if (isNaN(formattedKeys[id + "_" + key.toLowerCase()])) {return; }
            }
            if (key === "Fail") {
                formattedKeys[id + "_" + key.toLowerCase()] = parseFloat(section[key]);
                if (isNaN(formattedKeys[id + "_" + key.toLowerCase()])) {return; }
            }
            if (key === "Audit") {
                formattedKeys[id + "_" + key.toLowerCase()] = parseFloat(section[key]);
                if (isNaN(formattedKeys[id + "_" + key.toLowerCase()])) {return; }
            }
        }
    }

    private checkKeysComplete(formattedKeys: any, id: string): boolean {
        if (formattedKeys[id + "_dept"] !== undefined &&
            formattedKeys[id + "_id"] !== undefined &&
            formattedKeys[id + "_avg"] !== undefined &&
            formattedKeys[id + "_instructor"] !== undefined &&
            formattedKeys[id + "_title"] !== undefined &&
            formattedKeys[id + "_pass"] !== undefined &&
            formattedKeys[id + "_fail"] !== undefined &&
            formattedKeys[id + "_audit"] !== undefined
            && formattedKeys[id + "_uuid"] !== undefined &&
            formattedKeys[id + "_year"] !== undefined) {
            return true;
        }
        return false;
    }

    public removeDataset(id: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.checkValidIdToRemove(id)) {
                reject(new InsightError());
            }
            if (!this.checkIdExists(id)) {
                reject(new NotFoundError());
            }
            fs.readdirSync("./data/cache").forEach((file: string) => {
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
        return false;
    }
}
