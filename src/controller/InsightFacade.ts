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

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.addedData = {};
        fs.readdirSync("./data/").forEach((file: string) => {
            let fileData: string = fs.readFileSync(file).toString();
            let parsedFile: any = JSON.parse(fileData);
            let key: string = Object.keys(parsedFile)[0];
            this.addedData[key] = parsedFile[key];
        });
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let promisesList: Array<Promise<any>> = [];
        return new Promise((resolve, reject) => {
            if (!this.checkValidId(id)) {
                reject(new InsightError());
            } else {
                new JSZip().loadAsync(content, {base64: true}).then((unzipped) => {
                    let folder = unzipped.folder("courses");
                    let coursesFolderExists = false;
                    Object.values(folder.files).forEach((dir) => {
                        if (dir.dir) {
                            if (dir.name.includes("courses/")) {coursesFolderExists = true; }
                        }
                        if ((!dir.dir) && coursesFolderExists) {
                            if (dir.name.includes("courses/")) {promisesList.push(dir.async("text")); }
                        }
                    });
                    Promise.all(promisesList).then((resultFiles: string[]) => {
                        if (resultFiles.length === 0) {
                            reject(new InsightError());
                        }
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
                            this.addedData[id] = data;
                            let stringifiedFile = JSON.stringify(this.addedData);
                            try {
                                fs.writeFileSync("./data/" + id, stringifiedFile);
                            } catch (e) {
                                reject(new InsightError());
                            }
                            resolve(Object.keys(this.addedData));
                        } else {reject(new InsightError()); }
                    }).catch((err: any) => {
                        reject(new InsightError());
                    });
                }).catch((err: any) => {
                    reject(new InsightError());
                });
            }
        });
    }

    private convertToJSON(file: string): any {
        return JSON.parse(file);
    }

    private checkValidId(id: string): boolean {
        if (id === null || id === undefined || id.length === undefined) {
            return false;
        }
        if (id.length === 0 || typeof id !== "string" || /^\s*$/.test(id) || id.includes("_")) {
            return false;
        }
        for (let existingIds of Object.keys(this.addedData)) {
            if (existingIds === id) {return false; }
        }
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
        let result: any[] = file["result"];
        result.forEach((section: any) => {
            let formattedKeys: any = {};
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
                }
                formattedKeys[id + "_" + key.toLowerCase()] = parseFloat(section[key]);
                if (isNaN(formattedKeys[id + "_" + key.toLowerCase()])) {return; }
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
        if (formattedKeys[id + "_dept"] !== undefined && formattedKeys[id + "_id"] !== undefined &&
            formattedKeys[id + "_avg"] !== undefined && formattedKeys[id + "_instructor"] !== undefined &&
            formattedKeys[id + "_title"] !== undefined && formattedKeys[id + "_pass"] !== undefined &&
            formattedKeys[id + "_fail"] !== undefined && formattedKeys[id + "_audit"] !== undefined &&
            formattedKeys[id + "_uuid"] !== undefined && formattedKeys[id + "_year"] !== undefined) {
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
            Object.keys(this.addedData).forEach((idKey: string) => {
                if (idKey === id) {
                    fs.unlink("./data/" + idKey, (err) => {
                        if (err) {throw err; }
                        delete this.addedData[id];
                        resolve(id);
                    });
                }
            });
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
                dataValues["numRows"] = this.addedData[key].length;
                dataValues["kind"] = InsightDatasetKind.Courses;
                currentDatasets.push(dataValues);
            });
            resolve(currentDatasets);
        });
    }

    private checkValidIdToRemove(id: string) {
        if (id === null || id === undefined || id.length === undefined) {
            return false;
        }
        if (id.length === 0 || typeof id !== "string" || /^\s*$/.test(id) || id.includes("_")) {
            return false;
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
