import Log from "../Util";
import * as JSZip from "jszip";
import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import * as fs from "fs";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class CoursesValidation {
    private addedData: any;
    private  addedRoomsData: any;

    constructor(memoryData: any, memoryRoomsData: any) {
        Log.trace("Validating Courses");
        this.addedData = memoryData;
        this.addedRoomsData = memoryRoomsData;
    }

    public convertClassesToString(folder: JSZip, coursesFolderExists: boolean, courseValidator: CoursesValidation,
                                  promisesListCourses: Array<Promise<any>>) {
        Object.values(folder.files).forEach((dir) => {
            coursesFolderExists = courseValidator.checkIfDirectory(dir, coursesFolderExists);
            courseValidator.checkIfCoursesExist(dir, coursesFolderExists, promisesListCourses);
        });
    }

    public extractDataFromCourses(resultFiles: string[], id: string, data: JSON[]) {
        resultFiles.forEach((object: string) => {
            try {
                let jsonifiedFile: JSON = this.convertToJSON(object);
                this.checkValidFile(jsonifiedFile, id, data);
            } catch {
                return;
            }
        });
    }

    public checkIfCoursesExist(dir: JSZip.JSZipObject, coursesFolderExists: boolean,
                               promisesList: Array<Promise<any>>) {
        if ((!dir.dir) && coursesFolderExists) {
            if (dir.name.includes("courses/")) {
                promisesList.push(dir.async("text"));
            }
        }
    }

    public checkIfDirectory(dir: JSZip.JSZipObject, coursesFolderExists: boolean) {
        if (dir.dir) {
            if (dir.name.includes("courses/")) {
                coursesFolderExists = true;
            }
        }
        return coursesFolderExists;
    }

    public checkEachCourse(promisesListCourses: Array<Promise<any>>, reject: (reason?: any) => void,
                           courseValidator: CoursesValidation,
                           id: string, kind: InsightDatasetKind.Courses,
                           resolve: (value?: (PromiseLike<string[]> | string[])) => void) {
        Promise.all(promisesListCourses).then((resultFiles: string[]) => {
            if (resultFiles.length === 0) {
                reject(new InsightError());
            }
            let data: JSON[] = [];
            courseValidator.extractDataFromCourses(resultFiles, id, data);
            if (data.length !== 0) {
                this.addedData[id] = data;
                let saved = {id: id, kind: kind, data: this.addedData};
                // stringify saved instead, then write this result
                let stringifiedFile = JSON.stringify(saved);
                try {
                    fs.writeFileSync("./data/" + id, stringifiedFile);
                } catch (e) {
                    reject(new InsightError());
                }
                let allKeys: string[] = [];
                Object.keys(this.addedData).forEach((course: any) => {
                    allKeys.push(course);
                });
                Object.keys(this.addedRoomsData).forEach((room: any) => {
                    allKeys.push(room);
                });
                resolve(allKeys);
            } else {
                reject(new InsightError());
            }
        }).catch((err: any) => {
            reject(new InsightError());
        });
    }

    public convertToJSON(file: string): any {
        return JSON.parse(file);
    }

    public checkValidId(id: string): boolean {
        if (id === null || id === undefined || id.length === undefined) {
            return false;
        }
        if (id.length === 0 || typeof id !== "string" || /^\s*$/.test(id) || id.includes("_")) {
            return false;
        }
        for (let existingIds of Object.keys(this.addedData)) {
            if (existingIds === id) {
                return false;
            }
        }
        return true;
    }

    public checkValidFile(file: any, id: string, data: JSON[]) {
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

    public setKeyValues(formattedKeys: any, targetKeys: string[], id: string, section: any) {
        for (let key of targetKeys) {
            if (section["Section"] === undefined) {
                return;
            }
            if (section[key] === undefined) {
                return;
            }
            this.setDept(key, formattedKeys, id, section);
            this.setId(key, formattedKeys, id, section);
            this.setTitle(key, formattedKeys, id, section);
            this.setInstructor(key, formattedKeys, id, section);
            this.setUuid(key, formattedKeys, id, section);
            if (key === "Year") {
                this.setYear(section, formattedKeys, id, key);
                if (isNaN(formattedKeys[id + "_" + key.toLowerCase()])) {
                    return;
                }
            }
            if (key === "Avg") {
                this.setAvg(formattedKeys, id, key, section);
                if (isNaN(formattedKeys[id + "_" + key.toLowerCase()])) {
                    return;
                }
            }
            if (key === "Pass") {
                this.setPass(formattedKeys, id, key, section);
                if (isNaN(formattedKeys[id + "_" + key.toLowerCase()])) {
                    return;
                }
            }
            if (key === "Fail") {
                this.setFail(formattedKeys, id, key, section);
                if (isNaN(formattedKeys[id + "_" + key.toLowerCase()])) {
                    return;
                }
            }
            if (key === "Audit") {
                this.setAudit(formattedKeys, id, key, section);
                if (isNaN(formattedKeys[id + "_" + key.toLowerCase()])) {
                    return;
                }
            }
        }
    }

    public setAudit(formattedKeys: any, id: string, key: string, section: any) {
        formattedKeys[id + "_" + key.toLowerCase()] = parseFloat(section[key]);
    }

    public setFail(formattedKeys: any, id: string, key: string, section: any) {
        formattedKeys[id + "_" + key.toLowerCase()] = parseFloat(section[key]);
    }

    public setPass(formattedKeys: any, id: string, key: string, section: any) {
        formattedKeys[id + "_" + key.toLowerCase()] = parseFloat(section[key]);
    }

    public setAvg(formattedKeys: any, id: string, key: string, section: any) {
        formattedKeys[id + "_" + key.toLowerCase()] = parseFloat(section[key]);
    }

    public setUuid(key: string, formattedKeys: any, id: string, section: any) {
        if (key === "id") {
            formattedKeys[id + "_uuid"] = section[key].toString();
        }
    }

    public setInstructor(key: string, formattedKeys: any, id: string, section: any) {
        if (key === "Professor") {
            formattedKeys[id + "_instructor"] = section[key].toString();
        }
    }

    public setTitle(key: string, formattedKeys: any, id: string, section: any) {
        if (key === "Title") {
            formattedKeys[id + "_" + key.toLowerCase()] = section[key].toString();
        }
    }

    public setId(key: string, formattedKeys: any, id: string, section: any) {
        if (key === "Course") {
            formattedKeys[id + "_id"] = section[key].toString();
        }
    }

    public setDept(key: string, formattedKeys: any, id: string, section: any) {
        if (key === "Subject") {
            formattedKeys[id + "_dept"] = section[key].toString();
        }
    }

    public setYear(section: any, formattedKeys: any, id: string, key: string) {
        if (section["Section"] === "overall") {
            formattedKeys[id + "_" + key.toLowerCase()] = 1900;
        } else {
            formattedKeys[id + "_" + key.toLowerCase()] = parseFloat(section[key]);
        }
    }

    public checkKeysComplete(formattedKeys: any, id: string): boolean {
        if (formattedKeys[id + "_dept"] !== undefined && formattedKeys[id + "_id"] !== undefined &&
            formattedKeys[id + "_avg"] !== undefined && formattedKeys[id + "_instructor"] !== undefined &&
            formattedKeys[id + "_title"] !== undefined && formattedKeys[id + "_pass"] !== undefined &&
            formattedKeys[id + "_fail"] !== undefined && formattedKeys[id + "_audit"] !== undefined &&
            formattedKeys[id + "_uuid"] !== undefined && formattedKeys[id + "_year"] !== undefined) {
            return true;
        }
        return false;
    }

    public checkValidIdToRemove(id: string) {
        if (id === null || id === undefined || id.length === undefined) {
            return false;
        }
        if (id.length === 0 || typeof id !== "string" || /^\s*$/.test(id) || id.includes("_")) {
            return false;
        }
        return true;
    }

    public checkIdExists(id: string): boolean {
        for (let existingIds of Object.keys(this.addedData)) {
            if (existingIds === id) {
                return true;
            }
        }
        return false;
    }
}
