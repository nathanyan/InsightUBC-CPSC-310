import Log from "../Util";
import * as JSZip from "jszip";
import * as fs from "fs";
import {
    IInsightFacade,
    InsightDataset,
    InsightDatasetKind,
    InsightError,
    NotFoundError,
    ResultTooLargeError
} from "./IInsightFacade";
import PerformQueryValid from "./PerformQueryValid";
import PerformQueryFilterDisplay from "./PerformQueryFilterDisplay";
import CoursesValidation from "./CoursesValidation";
import PerformQueryTransformations from "./PerformQueryTransformations";
import RoomsValidation from "./RoomsValidation";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    private addedData: any;
    private addedRoomsData: any;
    private uniqueIDsInQuery: any[];
    private applyKeysInQuery: any[];
    private groupKeysInQuery: any[];

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.addedData = {};
        this.addedRoomsData = {};
        this.uniqueIDsInQuery = [];
        this.applyKeysInQuery = [];
        this.groupKeysInQuery = [];
        fs.readdirSync("./data/").forEach((file: string) => {
            let fileData: string = fs.readFileSync(file).toString();
            let parsedFile: any = JSON.parse(fileData);
            for (let dataset of parsedFile) {
                if (dataset["kind"] === InsightDatasetKind.Courses) {
                    this.addedData[dataset["id"]] = dataset["data"];
                }
                if (dataset["kind"] === InsightDatasetKind.Rooms) {
                    this.addedRoomsData[dataset["id"]] = dataset["data"];
                }
            }
        });
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let courseValidator: CoursesValidation = new CoursesValidation(this.addedData, this.addedRoomsData);
        let roomValidator: RoomsValidation = new RoomsValidation(this.addedRoomsData, this.addedData);
        let promisesListCourses: Array<Promise<any>> = [];
        let promisesListRooms: Array<Promise<any>> = [];
        return new Promise((resolve, reject) => {
            if (!courseValidator.checkValidId(id) || !roomValidator.checkValidId(id)) {
                reject(new InsightError());
            } else {
                new JSZip().loadAsync(content, {base64: true}).then((unzipped) => {
                    if (kind === InsightDatasetKind.Courses) {
                        let folder = unzipped.folder("courses");
                        let coursesFolderExists = false;
                        courseValidator.convertClassesToString(folder, coursesFolderExists, courseValidator,
                            promisesListCourses);
                        courseValidator.checkEachCourse(promisesListCourses, reject, courseValidator, id, kind,
                            resolve);
                    }
                    if (kind === InsightDatasetKind.Rooms) {
                        let folder2 = unzipped.folder("rooms");
                        let roomsFolderExists = false;
                        let indexFileExists = false;
                        indexFileExists = roomValidator.convertRoomsToString(folder2, roomsFolderExists, roomValidator,
                            indexFileExists, promisesListRooms);
                        roomValidator.checkEachRoom(promisesListRooms, indexFileExists, roomValidator, id, kind)
                            .then((finalDataAllRooms: any[]) => {
                                resolve(finalDataAllRooms);
                            })
                            .catch((err: any) => {
                                Log.error(err);
                                reject(new InsightError());
                            });
                    }
                }).catch((err: any) => {
                    reject(new InsightError(err));
                });
            }
        });
    }

    public removeDataset(id: string): Promise<string> {
        let courseValidator: CoursesValidation = new CoursesValidation(this.addedData, this.addedRoomsData);
        let roomsValidator: RoomsValidation = new RoomsValidation(this.addedRoomsData, this.addedData);
        return new Promise((resolve, reject) => {
            if (!courseValidator.checkValidIdToRemove(id)) {
                reject(new InsightError());
            }
            if (!courseValidator.checkIdExists(id) && roomsValidator.checkValidId(id)) {
                reject(new NotFoundError());
            }
            this.checkCourses(id, resolve);
            this.checkRooms(id, resolve);
        });
    }

    private checkRooms(id: string, resolve: (value?: (PromiseLike<string> | string)) => void) {
        Object.keys(this.addedRoomsData).forEach((idKey: string) => {
            if (idKey === id) {
                fs.unlink("./data/" + idKey, (err) => {
                    if (err) {
                        throw err;
                    }
                    delete this.addedRoomsData[id];
                    resolve(id);
                });
            }
        });
    }

    private checkCourses(id: string, resolve: (value?: (PromiseLike<string> | string)) => void) {
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
    }

    public performQuery(query: any): Promise <any[]> {
        return new Promise((resolve, reject) => {
            if (!PerformQueryValid.isQueryValid(query, this.addedData, this.uniqueIDsInQuery, this.applyKeysInQuery,
                this.groupKeysInQuery, this.addedRoomsData)) {
                this.uniqueIDsInQuery = [];
                this.applyKeysInQuery = [];
                this.groupKeysInQuery = [];
                return reject(new InsightError("Query is invalid"));
            }
            let idToQuery: string = this.uniqueIDsInQuery[0];           // only 1 id in uniqueIDsInQuery = one to query
            let datasetToParse: any[] = [];
            if (idToQuery in this.addedData) {
                datasetToParse = this.addedData[idToQuery];      // the only dataset we need to look at
            } else {
                datasetToParse = this.addedRoomsData[idToQuery];
            }
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
            let allCourseData: string[] = Object.keys(this.addedData);
            let allRoomsData: string[] = Object.keys(this.addedRoomsData);
            this.listCoursesData(allCourseData, currentDatasets);
            this.listRoomsData(allRoomsData, currentDatasets);
            resolve(currentDatasets);
        });
    }

    private listRoomsData(allRoomsData: string[], currentDatasets: InsightDataset[]) {
        allRoomsData.forEach((key: string) => {
            let dataValues: any = {};
            dataValues["id"] = key;
            dataValues["numRows"] = this.addedRoomsData[key].length;
            dataValues["kind"] = InsightDatasetKind.Rooms;
            currentDatasets.push(dataValues);
        });
    }

    private listCoursesData(allCourseData: string[], currentDatasets: InsightDataset[]) {
        allCourseData.forEach((key: string) => {
            let dataValues: any = {};
            dataValues["id"] = key;
            dataValues["numRows"] = this.addedData[key].length;
            dataValues["kind"] = InsightDatasetKind.Courses;
            currentDatasets.push(dataValues);
        });
    }
}
