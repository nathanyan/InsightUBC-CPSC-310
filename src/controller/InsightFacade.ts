import Log from "../Util";
import * as JSZip from "jszip";
import * as fs from "fs";
import {IInsightFacade, InsightDataset, InsightDatasetKind, ResultTooLargeError} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
import PerformQueryValid from "./PerformQueryValid";
import PerformQueryFilterDisplay from "./PerformQueryFilterDisplay";
import CoursesValidation from "./CoursesValidation";
import PerformQueryTransformations from "./PerformQueryTransformations";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    private addedData: any;
    private uniqueIDsInQuery: any[];
    private applyKeysInQuery: any[];
    private groupKeysInQuery: any[];

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.addedData = {};
        this.uniqueIDsInQuery = [];
        this.applyKeysInQuery = [];
        this.groupKeysInQuery = [];
        fs.readdirSync("./data/").forEach((file: string) => {
            let fileData: string = fs.readFileSync(file).toString();
            let parsedFile: any = JSON.parse(fileData);
            let key: string = Object.keys(parsedFile)[0];
            this.addedData[key] = parsedFile[key];
        });
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let courseValidator: CoursesValidation = new CoursesValidation(this.addedData);
        let promisesList: Array<Promise<any>> = [];
        return new Promise((resolve, reject) => {
            if (!courseValidator.checkValidId(id)) {
                reject(new InsightError());
            } else {
                new JSZip().loadAsync(content, {base64: true}).then((unzipped) => {
                    let folder = unzipped.folder("courses");
                    let coursesFolderExists = false;
                    Object.values(folder.files).forEach((dir) => {
                        coursesFolderExists = courseValidator.checkIfDirectory(dir, coursesFolderExists);
                        courseValidator.checkIfCoursesExist(dir, coursesFolderExists, promisesList);
                    });
                    Promise.all(promisesList).then((resultFiles: string[]) => {
                        if (resultFiles.length === 0) {
                            reject(new InsightError());
                        }
                        let data: JSON[] = [];
                        courseValidator.extractDataFromCourses(resultFiles, id, data);
                        if (data.length !== 0) {
                            this.addedData[id] = data;
                            let stringifiedFile = JSON.stringify(this.addedData);
                            try {
                                fs.writeFileSync("./data/" + id, stringifiedFile);
                            } catch (e) {
                                reject(new InsightError());
                            }
                            resolve(Object.keys(this.addedData));
                        } else {
                            reject(new InsightError());
                        }
                    }).catch((err: any) => {
                        reject(new InsightError());
                    });
                }).catch((err: any) => {
                    reject(new InsightError());
                });
            }
        });
    }

    public removeDataset(id: string): Promise<string> {
        let courseValidator: CoursesValidation = new CoursesValidation(this.addedData);
        return new Promise((resolve, reject) => {
            if (!courseValidator.checkValidIdToRemove(id)) {
                reject(new InsightError());
            }
            if (!courseValidator.checkIdExists(id)) {
                reject(new NotFoundError());
            }
            Object.keys(this.addedData).forEach((idKey: string) => {
                if (idKey === id) {
                    fs.unlink("./data/" + idKey, (err) => {
                        if (err) {
                            throw err;
                        }
                        delete this.addedData[id];
                        resolve(id);
                    });
                }
            });
        });
    }

    public performQuery(query: any): Promise <any[]> {
        return new Promise((resolve, reject) => {
            if (!PerformQueryValid.isQueryValid(query, this.addedData, this.uniqueIDsInQuery, this.applyKeysInQuery,
                this.groupKeysInQuery)) {
                this.uniqueIDsInQuery = [];
                this.applyKeysInQuery = [];
                this.groupKeysInQuery = [];
                return reject(new InsightError("Query is invalid"));
            }
            let idToQuery: string = this.uniqueIDsInQuery[0];           // only 1 id in uniqueIDsInQuery = one to query
            let datasetToParse: any[] = this.addedData[idToQuery];      // the only dataset we need to look at
            let resultSoFar: any[] = [];
            let where: any = query["WHERE"];
            resultSoFar = PerformQueryFilterDisplay.filterCourseSections(datasetToParse, where);
            if ("TRANSFORMATIONS" in query) {       // put sections into groups
                let transformations: any = query["TRANSFORMATIONS"];
                resultSoFar = PerformQueryTransformations.groupAndApply(resultSoFar, transformations);
            }
            if (resultSoFar.length > 5000) {
                Log.trace(resultSoFar);
                this.uniqueIDsInQuery = [];
                this.applyKeysInQuery = [];
                this.groupKeysInQuery = [];
                return reject (new ResultTooLargeError());
            } else {
                let options: any = query["OPTIONS"];
                let finalResult: any[];
                finalResult = PerformQueryFilterDisplay.displayByOptions(resultSoFar, options);
                this.uniqueIDsInQuery = [];
                this.applyKeysInQuery = [];
                this.groupKeysInQuery = [];
                Log.trace(finalResult);
                return resolve(finalResult);
            }
        });
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
}
