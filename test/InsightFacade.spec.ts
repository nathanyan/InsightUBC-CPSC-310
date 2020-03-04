import {expect} from "chai";
import * as fs from "fs-extra";
import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";

// This should match the schema given to TestUtil.validate(..) in TestUtil.readTestQueries(..)
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any;  // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: any;
    filename: string;  // This is injected when reading the file
}

describe("InsightFacade Add/Remove Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the 'before' hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        coursesInvalidKey: "./test/data/coursesInvalidkey.zip",
        coursesNoValidFile: "./test/data/coursesNoneValid.zip",
        coursesNullKey: "./test/data/coursesNullKey.zip",
        coursesNullValue: "./test/data/coursesNullValue.zip",
        coursesNoFiles: "./test/data/coursesNoFiles.zip",
        coursesSomeEmpty: "./test/data/coursesSomeEmpty.zip",
        coursesAllEmpty: "./test/data/coursesAllEmpty.zip",
        courses2: "./test/data/coursesValid2.zip",
        cour_ses: "./test/data/coursesValid2.zip",
        _courses: "./test/data/coursesValid2.zip",
        courses_: "./test/data/coursesValid2.zip",
        courses3: "./test/data/coursesValid3.zip",
        coursesGarbage: "./test/data/coursesHalfGarbage.zip",
        testJPG: "./test/data/test.jpg",
        courseOnlyOneFile: "./test/data/oneCourse",
        coursesFolder: "./test/data/coursesFolder.zip",
        coursesWrongFolder: "./test/data/coursesWrongFolder.zip",
        coursesExtraFolder: "./test/data/coursesExtraFolder.zip",
        coursesJsonOnly: "./test/data/AND.json",
        rooms: "./test/data/rooms.zip",
        roomsSmaller: "./test/data/roomsSmaller.zip",
        roomsNoneValid: "./test/data/roomsNoneValid.zip",
        roomsExtraFolder: "./test/data/roomsExtraFolder.zip",
        roomsNotZip: "./test/data/ANGU",
        noRoomsFolder: "./test/data/roomWrong.zip",
        roomsOverallValid: "./test/data/roomsOverallValid.zip",
        roomsNoBuildings: "./test/data/roomsNoBuildings.zip",
        roomsGarbageFiles: "./test/data/roomsGarbageFiles.zip",
        roomsEmptyBuildings: "./test/data/roomsEmptyBuildings.zip",
        roomsNoIndex: "./test/data/roomsNoHTML.zip"
    };
    let datasets: { [id: string]: string } = {};
    let insightFacade: InsightFacade;
    const cacheDir = __dirname + "/../data";

    before(function () {
        // This section runs once and loads all datasets specified in the datasetsToLoad object
        // into the datasets object
        Log.test(`Before all`);
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs.readFileSync(datasetsToLoad[id]).toString("base64");
        }
    });

    beforeEach(function () {
        // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
        // This runs before each test, which should make each test independent from the previous one
        Log.test(`BeforeTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // This is a unit test. You should create more like this!
    it("Should add a valid dataset", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
    });

    // me
    it("Should reject a dataset with underscore id in middle", function () {
        const id: string = "cour_ses";
        const expected: string[] = [];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, expected, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should add a valid dataset, smaller dataset", function () {
        const id: string = "coursesInvalidKey";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
    });

    it("Should add a dataset with extra folder with courses folder, multiple dataset", function () {
        const id: string = "courses";
        const id2: string = "coursesExtraFolder";
        const expected: string[] = [id];
        const expected2: string[] = [id, id2];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
                return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses)
                    .then((result2: string[]) => {
                        expect(result2).to.deep.equal(expected2);
                    })
                    .catch((err: any) => {
                        expect.fail(err, expected2, "Should not have rejected valid dataset");
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
    });

    it("Should add a dataset with extra folder with courses folder", function () {
        const id2: string = "coursesExtraFolder";
        const expected2: string[] = [id2];
        return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses)
            .then((result2: string[]) => {
                expect(result2).to.deep.equal(expected2);
            })
            .catch((err: any) => {
                expect.fail(err, expected2, "Should not have rejected valid dataset");
            });
    });

    it("Should reject a dataset with only one text file, no zip", function () {
        const id: string = "courses";
        const idOneCourse: string = "courseOnlyOneFile";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
                return insightFacade.addDataset(idOneCourse, datasets[idOneCourse], InsightDatasetKind.Courses)
                    .then((result2: string[]) => {
                        expect.fail(result2, expected, "Should not have added invalid dataset");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.instanceOf(InsightError);
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
    });

    it("Should reject a dataset with null as id key", function () {
        const id: string = null;
        const expected: string[] = [];
        return insightFacade.addDataset(id, datasets["courses"], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, expected, "Should not have added null id key");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should reject a dataset with undefined as id key", function () {
        const id: string = undefined;
        const expected: string[] = [];
        return insightFacade.addDataset(id, datasets["courses"], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, expected, "Should not have added null id key");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should reject a dataset with only one json file, no zip", function () {
        const id: string = "courses";
        const idOneCourse: string = "coursesJsonOnly";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
                return insightFacade.addDataset(idOneCourse, datasets[idOneCourse], InsightDatasetKind.Courses)
                    .then((result2: string[]) => {
                        expect.fail(result2, expected, "Should not have added invalid dataset");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.instanceOf(InsightError);
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
    });

    it("Should reject a dataset with no courses folder", function () {
        const id: string = "courses";
        const idNoFolder: string = "coursesFolder";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
                return insightFacade.addDataset(idNoFolder, datasets[idNoFolder], InsightDatasetKind.Courses)
                    .then((result2: string[]) => {
                        expect.fail(result2, expected, "Should not have added invalid dataset");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.instanceOf(InsightError);
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
    });

    it("Should reject a dataset with no courses folder, single behaviour", function () {
        const idNoFolder: string = "coursesFolder";
        const expected: string[] = [];
        return insightFacade.addDataset(idNoFolder, datasets[idNoFolder], InsightDatasetKind.Courses)
            .then((result2: string[]) => {
                expect.fail(result2, expected, "Should not have added invalid dataset");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should reject a dataset with sub-folder but not named courses", function () {
        const id: string = "courses";
        const idWrongFolder: string = "coursesWrongFolder";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
                return insightFacade.addDataset(idWrongFolder, datasets[idWrongFolder], InsightDatasetKind.Courses)
                    .then((result2: string[]) => {
                        expect.fail(result2, expected, "Should not have added invalid dataset");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.instanceOf(InsightError);
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
    });

    it("Should reject a dataset with underscore id at start", function () {
        const id: string = "_courses";
        const expected: string[] = [];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, expected, "Should not have added dataset with invalid id");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should reject a dataset with underscore id at end", function () {
        const id: string = "courses_";
        const expected: string[] = [];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, expected, "Should not have added dataset with invalid id");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should reject a dataset with existing id", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
                return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
                    .then((result2: string[]) => {
                        expect.fail(result2, expected, "Should not have added duplicate dataset");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.instanceOf(InsightError);
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should have rejected adding duplicate dataset");
            });
    });

    it("Should reject a dataset with existing id when multiple added", function () {
        const id: string = "courses";
        const id2: string = "courses2";
        const id3: string = "courses3";
        const expected1: string[] = [id];
        const expected2: string[] = [id, id2];
        const expected3: string[] = [id, id2, id3];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected1);
                return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses)
                    .then((result2: string[]) => {
                        expect(result2).to.deep.equal(expected2);
                        return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses)
                            .then(then1)
                            .catch(catch2);
                        function then1(result3: string[]) {
                            expect.fail(result3, expected2, "Should not have added identical id dataset");
                        }
                        function catch2(err: any) {
                            expect(err).to.be.instanceOf(InsightError);
                            return insightFacade.addDataset(id3, datasets[id3], InsightDatasetKind.Courses)
                                .then(addDataSetOuter)
                                .catch(outCatch);
                            function addDataSetOuter(result4: string[]) {
                                expect(result4).to.deep.equal(expected3);
                                return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
                                    .then(addDatasetThen)
                                    .catch(finalPromise);
                                function addDatasetThen(result5: string[]) {
                                    expect.fail(result5, expected3, "Should not have added identical id 2");
                                }
                                function finalPromise(err2: any) {
                                    expect(err2).to.be.instanceOf(InsightError);
                                }
                            }
                            function outCatch(err1: any) {
                                expect.fail(err1, expected3, "Should not have rejected 3");
                            }
                        }
                    })
                    .catch((err: any) => {
                        expect.fail(err, expected2, "Should not have rejected 2");
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected1, "Should not have rejected");
            });
    });

    it("Should reject a dataset with only whitespace id", function () {
        const id: string = "    ";
        const expected: string[] = [];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, expected, "Should not have added dataset with invalid id");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should reject a dataset with empty string ID", function () {
        const id: string = "";
        const expected: string[] = [];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, expected, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should reject a dataset with empty string ID when multiple dataset", function () {
        const id: string = "courses";
        const id2: string = "courses2";
        const id3: string = "courses3";
        const idE: string = "";
        const expected1: string[] = [id];
        const expected2: string[] = [id, id2];
        const expected3: string[] = [id, id2, id3];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
                expect(result).to.deep.equal(expected1);
                return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses)
                    .then((result2: string[]) => {
                        expect(result2).to.deep.equal(expected2);
                        return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses)
                            .then(then3)
                            .catch(catch3);
                        function then3(result3: string[]) {
                            expect.fail(result3, expected2, "Should not have added identical id");
                        }
                        function catch3(err: any) {
                            expect(err).to.be.instanceOf(InsightError);
                            return insightFacade.addDataset(id3, datasets[id3], InsightDatasetKind.Courses)
                                .then(then2)
                                .catch(catch2);
                            function catch2(err1: any) {
                                expect.fail(err1, expected3, "Should not have rejected 3");
                            }
                            function then2(result4: string[]) {
                                expect(result4).to.deep.equal(expected3);
                                return insightFacade.addDataset(idE, datasets[idE], InsightDatasetKind.Courses)
                                    .then(thenInner)
                                    .catch(catchInner);
                                function thenInner(result5: string[]) {
                                    expect.fail(result5, expected3,
                                        "Should not have added empty string ID dataset");
                                }
                                function catchInner(err2: any) {
                                    expect(err2).to.be.instanceOf(InsightError);
                                }
                            }
                        }
                    })
                    .catch((err: any) => {
                        expect.fail(err, expected2, "Should not have rejected 2");
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected1, "Should not have rejected");
            });
    });

    it("Should reject a non-existing dataset with valid ID", function () {
        const id: string = "courses4";
        const expected: string[] = [];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, expected, "Should not have added non-existing dataset");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should add a dataset with whitespace in middle of id", function () {
        const id: string = "cour ses";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets["courses"], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
    });

    it("Should add a dataset with whitespace at start of id", function () {
        const id: string = " courses";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets["courses"], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
    });

    it("Should add a dataset with whitespace at end of id", function () {
        const id: string = "courses ";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets["courses"], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
    });

    it("Should add a dataset with invalid JSON format in only one file", function () {
        const id: string = "coursesInvalidKey";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should have added valid dataset");
            });
    });

    it("Should add a dataset with invalid JSON format in only one file, multiple dataset", function () {
        const id: string = "coursesInvalidKey";
        const id2: string = "courses";
        const expected: string[] = [id2];
        const expected2: string[] = [id2, id];
        return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.be.deep.equal(expected);
                return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
                    .then((result2: string[]) => {
                        expect(result2).to.deep.equal(expected2);
                    })
                    .catch((err: any) => {
                        expect.fail(err, expected2, "Should not have reject valid dataset");
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should have added valid dataset");
            });
    });

    it("Should reject a dataset with no valid JSON file", function () {
        const id: string = "coursesNoFileValid";
        const expected: string[] = [];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, expected, "Should not have added");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should reject a dataset with no valid JSON file, multiple dataset", function () {
        const id: string = "coursesNoFileValid";
        const id2: string = "courses";
        const expected2: string[] = [id2];
        return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.be.deep.equal(expected2);
                return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
                    .then((result2: string[]) => {
                        expect.fail(result2, expected2, "Should not have added invalid dataset");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.instanceOf(InsightError);
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected2, "Should have added valid dataset");
            });
    });

    it("Should reject a dataset with null JSON key", function () {
        const id: string = "coursesNullKey";
        const expected: string[] = [];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, expected, "Should not have added invalid dataset");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should reject a dataset with null JSON key, multiple dataset", function () {
        const id: string = "coursesNullKey";
        const id2: string = "courses";
        const expected2: string[] = [id2];
        return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.be.deep.equal(expected2);
                return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
                    .then((result2: string[]) => {
                        expect.fail(result2, expected2, "Should not have added invalid dataset");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.instanceOf(InsightError);
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected2, "Should have added valid dataset");
            });
    });

    it("Should reject a dataset with null JSON value", function () {
        const id: string = "coursesNullValue";
        const expected: string[] = [];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, expected, "Should not have added");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should reject a dataset with null JSON value, multiple dataset", function () {
        const id: string = "coursesNullValue";
        const id2: string = "courses";
        const expected2: string[] = [id2];
        return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.be.deep.equal(expected2);
                return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
                    .then((result2: string[]) => {
                        expect.fail(result2, expected2, "Should not have added invalid dataset");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.instanceOf(InsightError);
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected2, "Should have added valid dataset");
            });
    });

    it("Should reject dataset with no JSON files", function () {
        const id: string = "coursesNoFiles";
        const expected: string[] = [];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, expected, "Should not have added empty dataset");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should reject dataset with no JSON files, multiple dataset", function () {
        const id: string = "coursesNoFiles";
        const id2: string = "courses";
        const expected2: string[] = [id2];
        return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.be.deep.equal(expected2);
                return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
                    .then((result2: string[]) => {
                        expect.fail(result2, expected2, "Should have rejected empty dataset");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.instanceOf(InsightError);
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected2, "Should have added valid dataset");
            });
    });

    it("Should add a dataset with half garbage files, one valid JSON files", function () {
        const id: string = "coursesGarbage";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
    });

    it("Should add a dataset with half garbage files, multiple dataset", function () {
        const id: string = "coursesGarbage";
        const id2: string = "courses";
        const expected2: string[] = [id2];
        const expected: string[] = [id2, id];
        return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.be.deep.equal(expected2);
                return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
                    .then((result2: string[]) => {
                        expect(result2).to.deep.equal(expected);
                    })
                    .catch((err: any) => {
                        expect.fail(err, expected, "Should not have rejected dataset");
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected2, "Should have added valid dataset");
            });
    });

    it("Should add a dataset with some empty JSON files", function () {
        const id: string = "coursesSomeEmpty";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
    });

    it("Should add a dataset with some empty JSON files, multiple dataset", function () {
        const id: string = "coursesSomeEmpty";
        const id2: string = "courses";
        const expected2: string[] = [id2];
        const expected: string[] = [id2, id];
        return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.be.deep.equal(expected2);
                return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
                    .then((result2: string[]) => {
                        expect(result2).to.deep.equal(expected);
                    })
                    .catch((err: any) => {
                        expect.fail(err, expected, "Should not have rejected empty dataset");
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected2, "Should have added valid dataset");
            });
    });

    it("Should reject dataset with all empty JSON files", function () {
        const id: string = "coursesAllEmpty";
        const expected: string[] = [];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, expected, "Should not have added empty dataset");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should reject dataset with all empty JSON files, multiple dataset", function () {
        const id: string = "coursesAllEmpty";
        const id2: string = "courses";
        const expected2: string[] = [id2];
        return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.be.deep.equal(expected2);
                return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
                    .then((result2: string[]) => {
                        expect.fail(result2, expected2, "Should have rejected empty dataset");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.instanceOf(InsightError);
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected2, "Should have added valid dataset");
            });
    });

    it("Should remove valid dataset", function () {
        const id: string = "courses";
        const collection: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(collection);
                return insightFacade.removeDataset(id)
                    .then((result2: string) => {
                        expect(result2).to.deep.equal(id);
                    })
                    .catch((err: any) => {
                        expect.fail(err, id, "Should have removed valid dataset");
                    });
            })
            .catch((err: any) => {
                expect.fail(err, collection, "Should have added valid dataset");
            });
    });

    it("Should reject add on dataset not zip", function () {
        const id: string = "courses";
        const idJpg: string = "testJPG";
        const collection: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(collection);
                return insightFacade.addDataset(idJpg, datasets[idJpg], InsightDatasetKind.Courses)
                    .then((result2: string[]) => {
                        expect.fail(result2, collection, "Should have rejected dataset not a zip");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.instanceOf(InsightError);
                    });
            })
            .catch((err: any) => {
                expect.fail(err, collection, "Should have added valid dataset");
            });
    });

    it("Should not remove valid ID not existing in dataset", function () {
        const id: string = "courses";
        const id2: string = "courses2";
        const collection: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(collection);
                return insightFacade.removeDataset(id2)
                    .then((result2: string) => {
                        expect.fail(result2, "Should not have removed dataset not added");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.instanceOf(NotFoundError);
                    });
            })
            .catch((err: any) => {
                expect.fail(err, collection, "Should have added valid dataset");
            });
    });

    it("Should not remove existing dataset with null id key", function () {
        const id: string = null;
        return insightFacade.addDataset(id, datasets["courses"], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, "Should not have removed dataset with null id key");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should not remove existing dataset with undefined id key", function () {
        const id: string = undefined;
        return insightFacade.addDataset(id, datasets["courses"], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, "Should not have removed dataset with undefined type id key");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should not remove invalid ID not existing in dataset", function () {
        const id: string = "courses";
        const id2: string = "cour_ses";
        const collection: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(collection);
                return insightFacade.removeDataset(id2)
                    .then((result2: string) => {
                        expect.fail(result2, "Should not have removed dataset not added");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.instanceOf(InsightError);
                    });
            })
            .catch((err: any) => {
                expect.fail(err, collection, "Should have added valid dataset");
            });
    });

    it("Should not remove invalid whitespace ID not existing in dataset", function () {
        const id: string = "courses";
        const id2: string = "   ";
        const collection: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(collection);
                return insightFacade.removeDataset(id2)
                    .then((result2: string) => {
                        expect.fail(result2, "Should not have removed dataset with invalid id");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.instanceOf(InsightError);
                    });
            })
            .catch((err: any) => {
                expect.fail(err, collection, "Should have added valid dataset");
            });
    });

    it("Should reject remove dataset from empty dataset", function () {
        const id: string = "courses2";
        return insightFacade.removeDataset(id)
            .then((result: string) => {
                expect.fail(result, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(NotFoundError);
            });
    });

    it("Should not remove non-existing dataset", function () {
        const id: string = "courses";
        const id2: string = "courses2";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
                return insightFacade.removeDataset(id2)
                    .then((result2: string) => {
                        expect.fail(result2, "Should not remove non-existing dataset");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.instanceOf(NotFoundError);
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should have added valid dataset");
            });
    });

    it("Should remove valid dataset while existing", function () {
        const id: string = "courses";
        const id2: string = "courses2";
        const expected: string[] = [id];
        const expected2: string[] = [id, id2];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
                return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses)
                    .then((result2: string[]) => {
                        expect(result2).to.deep.equal(expected2);
                        return insightFacade.removeDataset(id2)
                            .then(thenInner)
                            .catch(catchInner);
                        function catchInner(err: InsightError) {
                            expect.fail(err, id2, "Should have removed existing dataset");
                        }
                        function thenInner(result3: string) {
                            expect(result3).to.deep.equal(id2);
                        }
                    })
                    .catch((err: any) => {
                        expect.fail(err, expected2, "Should not have rejected");
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should have added valid dataset");
            });
    });

    it("Should not remove non-existing dataset and whitespace id", function () {
        const id: string = "courses";
        const id2: string = "courses2";
        const id3: string = "   ";
        const expected: string[] = [id];
        const expected2: string[] = [id, id2];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
                return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses)
                    .then((result2: string[]) => {
                        expect(result2).to.deep.equal(expected2);
                        return insightFacade.removeDataset(id3)
                            .then(thenInner)
                            .catch(catchInner);
                        function catchInner(err: any) {
                            expect(err).to.be.instanceOf(InsightError);
                        }
                        function thenInner(result3: string) {
                            expect.fail(result3, "Should not remove invalid ID dataset");
                        }
                    })
                    .catch((err: any) => {
                        expect.fail(err, expected2, "Should have added valid dataset 2");
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should have added valid dataset");
            });
    });

    it("Should not remove non-existing dataset and underscore id", function () {
        const id: string = "courses";
        const id2: string = "courses2";
        const id3: string = "courses_";
        const expected: string[] = [id];
        const expected2: string[] = [id, id2];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
                return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses)
                    .then((result2: string[]) => {
                        expect(result2).to.deep.equal(expected2);
                        return insightFacade.removeDataset(id3)
                            .then(thenInner)
                            .catch(catchInner);
                        function catchInner(err: any) {
                            expect(err).to.be.instanceOf(InsightError);
                        }
                        function thenInner(result3: string) {
                            expect.fail(result3, "Should not remove invalid ID dataset");
                        }
                    })
                    .catch((err: any) => {
                        expect.fail(err, expected2, "Should not have rejected add dataset");
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should have added valid dataset");
            });
    });

    it("List 1 dataset added", function () {
        const id: string = "courses";
        const expectedAdd: string[] = [id];
        const coursesDataset: InsightDataset =
            { id: "courses", numRows: 64612, kind: InsightDatasetKind.Courses } as InsightDataset;
        const expectedList: InsightDataset[] = [coursesDataset];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expectedAdd);
                return insightFacade.listDatasets()
                    .then((result2: InsightDataset[]) => {
                        expect(result2).to.deep.equal(expectedList);
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expectedAdd, "Should not have rejected");
            });
    });

    it("List 2 datasets added", function () {
        const id: string = "courses";
        const id2: string = "coursesInvalidKey";
        const expectedAdd: string[] = [id];
        const expectedAdd2: string[] = [id, id2];
        const coursesDataset: InsightDataset =
            { id: "courses", numRows: 64612, kind: InsightDatasetKind.Courses } as InsightDataset;
        const coursesDataset2: InsightDataset =
            { id: "coursesInvalidKey", numRows: 2, kind: InsightDatasetKind.Courses } as InsightDataset;
        const expectedList: InsightDataset[] = [coursesDataset];
        const expectedList2: InsightDataset[] = [coursesDataset, coursesDataset2];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expectedAdd);
                return insightFacade.listDatasets()
                    .then((result2: InsightDataset[]) => {
                        expect(result2).to.deep.equal(expectedList);
                        return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses)
                            .then(then2)
                            .catch(catchInner);
                        function then2(result3: string[]) {
                            expect(result3).to.deep.equal(expectedAdd2);
                            return insightFacade.listDatasets()
                                .then(thenInner);
                            function thenInner(result4: InsightDataset[]) {
                                expect(result4).to.deep.equal(expectedList2);
                            }
                        }
                        function catchInner(err: any) {
                            expect.fail(err, expectedAdd2, "Should not have rejected 2");
                        }
                    })
                    .catch((err: any) => {
                        expect.fail(err, expectedAdd2, "Should not have rejected 2");
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expectedAdd, "Should not have rejected");
            });
    });

    it("List 3 datasets added", function () {
        const id: string = "courses";
        const id2: string = "coursesInvalidKey";
        const id3: string = "coursesSomeEmpty";
        const expected: string[] = [id];
        const expected2: string[] = [id, id2];
        const expectedAdd: string[] = [id, id2, id3];
        const coursesDataset: InsightDataset =
            { id: "courses", numRows: 64612, kind: InsightDatasetKind.Courses } as InsightDataset;
        const coursesDataset2: InsightDataset =
            { id: "coursesInvalidKey", numRows: 2, kind: InsightDatasetKind.Courses } as InsightDataset;
        const coursesDataset3: InsightDataset =
            { id: "coursesSomeEmpty", numRows: 47, kind: InsightDatasetKind.Courses } as InsightDataset;
        const expectedList3: InsightDataset[] = [coursesDataset, coursesDataset2, coursesDataset3];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
                return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses)
                    .then((result2: string[]) => {
                        expect(result2).to.deep.equal(expected2);
                        return insightFacade.addDataset(id3, datasets[id3], InsightDatasetKind.Courses)
                            .then(thenInner)
                            .catch(catchInner);
                        function catchInner(err: any) {
                            expect.fail(err, expected2, "Should not have rejected valid add");
                        }
                        function thenInner(result3: string[]) {
                            expect(result3).to.deep.equal(expectedAdd);
                            return insightFacade.listDatasets().then(then5);
                            function then5(result4: InsightDataset[]) {
                                expect(result4).to.deep.equal(expectedList3);
                            }
                        }
                    })
                    .catch((err: any) => {
                        expect.fail(err, expected2, "Should not have rejected add");
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
    });

    it("Add and Remove and List datasets", function () {
        const id: string = "courses";
        const id2: string = "coursesInvalidKey";
        const expectedAdd: string[] = [id];
        const expectedAdd2: string[] = [id, id2];
        const coursesDataset: InsightDataset =
            { id: "courses", numRows: 64612, kind: InsightDatasetKind.Courses } as InsightDataset;
        const coursesDataset2: InsightDataset =
            { id: "coursesInvalidKey", numRows: 2, kind: InsightDatasetKind.Courses } as InsightDataset;
        const expectedList: InsightDataset[] = [coursesDataset];
        const expectedList2: InsightDataset[] = [coursesDataset, coursesDataset2];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
                expect(result).to.deep.equal(expectedAdd);
                return insightFacade.listDatasets().then((result2: InsightDataset[]) => {
                        expect(result2).to.deep.equal(expectedList);
                        return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses).then(then3)
                            .catch(catch2);
                        function then3(result3: string[]) {
                            expect(result3).to.deep.equal(expectedAdd2);
                            return insightFacade.listDatasets()
                                .then(thenMid);
                            function thenMid(result4: InsightDataset[]) {
                                expect(result4).to.deep.equal(expectedList2);
                                return insightFacade.removeDataset(id2)
                                    .then(then2)
                                    .catch(catchInner);
                                function then2(result5: string) {
                                    expect(result5).to.deep.equal(id2);
                                    return insightFacade.listDatasets().then(thenInner);
                                    function thenInner(result6: InsightDataset[]) {
                                        expect(result6).to.deep.equal(expectedList);
                                    }
                                }
                                function catchInner(err: any) {
                                    expect.fail(err, id2, "Should remove");
                                }
                            }
                        }
                        function catch2(err: any) {
                            expect.fail(err, expectedAdd2, "Should not have rejected 2");
                        }
                    })
                    .catch((err: any) => {
                        expect.fail(err, expectedAdd2, "Should not have rejected 2");
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expectedAdd, "Should not have rejected");
            });
    });

    it("List empty dataset", function () {
        const expectedList: InsightDataset[] = [];
        return insightFacade.listDatasets()
            .then((result: InsightDataset[]) => {
                expect(result).to.deep.equal(expectedList);
            });
    });

    it("Add 1 dataset, reject add 1 dataset, then list 1 dataset", function () {
        const id: string = "courses";
        const idNotExist: string = "courses356";
        const expectedAdd: string[] = [id];
        const coursesDataset: InsightDataset =
            { id: "courses", numRows: 64612, kind: InsightDatasetKind.Courses } as InsightDataset;
        const expectedList: InsightDataset[] = [coursesDataset];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expectedAdd);
                return insightFacade.addDataset(idNotExist, datasets[idNotExist], InsightDatasetKind.Courses)
                    .then((result2: string[]) => {
                        expect.fail(result2, expectedAdd, "Should not have added non-existing dataset with valid ID");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.instanceOf(InsightError);
                        return insightFacade.listDatasets().then(then5);
                        function then5(result3: InsightDataset[]) {
                            expect(result3).to.deep.equal(expectedList);
                        }
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expectedAdd, "Should not have rejected");
            });
    });

    it("Reject add 1 dataset, then list empty dataset", function () {
        const idInvalid: string = "courses_";
        const expectedAdd: string[] = [];
        const expectedList: InsightDataset[] = [];
        return insightFacade.addDataset(idInvalid, datasets[idInvalid], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, expectedAdd, "Should not have added dataset with invalid ID");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
                return insightFacade.listDatasets().then((result2: InsightDataset[]) => {
                    expect(result2).to.deep.equal(expectedList);
                });
            });
    });

    // start rooms tests here
    it("Should add a valid rooms dataset", function () {
        const id: string = "rooms";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
    });

    it("Should add 2 valid rooms datasets", function () {
        const id: string = "rooms";
        const id2: string = "rooms2";
        const expected: string[] = [id];
        const expected2: string[] = [id, id2];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
                return insightFacade.addDataset(id2, datasets["rooms"], InsightDatasetKind.Rooms)
                    .then((result2: string[]) => {
                        expect(result2).to.deep.equal(expected2);
                    })
                    .catch((err: any) => {
                        expect.fail(err, expected, "Should not have rejected");
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
    });

    it("Should reject a rooms dataset with no valid buildings", function () {
        const id: string = "roomsNoneValid";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect.fail(result, expected, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should reject invalid then add valid", function () {
        const id: string = "roomsNoneValid";
        const id2: string = "rooms";
        const expected: string[] = [id2];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect.fail(result, expected, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
                return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Rooms)
                    .then((result2: string[]) => {
                        expect(result2).to.deep.equal(expected);
                    })
                    .catch((err2: any) => {
                        expect.fail(err2, expected, "Should not have rejected");
                    });
            });
    });

    it("Should add valid course and rooms datasets", function () {
        const id: string = "courses";
        const id2: string = "rooms";
        const expected: string[] = [id];
        const expected2: string[] = [id, id2];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
                return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Rooms)
                    .then((result2: string[]) => {
                        expect(result2).to.deep.equal(expected2);
                    })
                    .catch((err: any) => {
                        expect.fail(err, expected, "Should not have rejected inner");
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected outer");
            });
    });

    it("Should reject valid rooms dataset with underscore id", function () {
        const id: string = "rooms_fail";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets["rooms"], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect.fail(result, expected, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should reject valid rooms dataset with whitespace id", function () {
        const id: string = " ";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets["rooms"], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect.fail(result, expected, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should add a valid rooms dataset with whitespace in front of id", function () {
        const id: string = " rooms";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets["rooms"], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
    });

    it("Should add a valid rooms dataset with whitespace in middle of id", function () {
        const id: string = "ro oms";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets["rooms"], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
    });

    it("Should add a valid rooms dataset with whitespace at end of id", function () {
        const id: string = "rooms ";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets["rooms"], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
    });

    it("Should add a dataset with extra folder with rooms folder, multiple dataset", function () {
        const id: string = "rooms";
        const id2: string = "roomsExtraFolder";
        const expected: string[] = [id];
        const expected2: string[] = [id, id2];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
                return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Rooms)
                    .then((result2: string[]) => {
                        expect(result2).to.deep.equal(expected2);
                    })
                    .catch((err: any) => {
                        expect.fail(err, expected2, "Should not have rejected valid dataset");
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
    });

    it("Should reject a rooms dataset with only one building file, no zip", function () {
        const id: string = "courses";
        const idOneBuilding: string = "roomsNotZip";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
                return insightFacade.addDataset(idOneBuilding, datasets[idOneBuilding], InsightDatasetKind.Rooms)
                    .then((result2: string[]) => {
                        expect.fail(result2, expected, "Should not have added invalid dataset");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.instanceOf(InsightError);
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
    });

    it("Should reject a rooms dataset with null as id key", function () {
        const id: string = null;
        const expected: string[] = [];
        return insightFacade.addDataset(id, datasets["rooms"], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect.fail(result, expected, "Should not have added null id key");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should reject a rooms dataset with undefined as id key", function () {
        const id: string = undefined;
        const expected: string[] = [];
        return insightFacade.addDataset(id, datasets["rooms"], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect.fail(result, expected, "Should not have added null id key");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should reject a rooms dataset with no rooms folder", function () {
        const id: string = "rooms";
        const idNoRoomsFolder: string = "noRoomsFolder";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
                return insightFacade.addDataset(idNoRoomsFolder, datasets[idNoRoomsFolder], InsightDatasetKind.Rooms)
                    .then((result2: string[]) => {
                        expect.fail(result2, expected, "Should not have added invalid dataset");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.instanceOf(InsightError);
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
    });

    it("Should reject a rooms dataset with existing id", function () {
        const id: string = "rooms";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
                return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms)
                    .then((result2: string[]) => {
                        expect.fail(result2, expected, "Should not have added duplicate dataset");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.instanceOf(InsightError);
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should have rejected adding duplicate dataset");
            });
    });

    it("Should reject a dataset with existing id when multiple added", function () {
        const id: string = "rooms";
        const id2: string = "rooms2";
        const id3: string = "courses";
        const expected1: string[] = [id];
        const expected2: string[] = [id, id2];
        const expected3: string[] = [id, id2, id3];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected1);
                return insightFacade.addDataset(id2, datasets["rooms"], InsightDatasetKind.Rooms)
                    .then((result2: string[]) => {
                        expect(result2).to.deep.equal(expected2);
                        return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses)
                            .then(then1)
                            .catch(catch2);
                        function then1(result3: string[]) {
                            expect.fail(result3, expected2, "Should not have added identical id dataset");
                        }
                        function catch2(err: any) {
                            expect(err).to.be.instanceOf(InsightError);
                            return insightFacade.addDataset(id3, datasets[id3], InsightDatasetKind.Courses)
                                .then(addDataSetOuter)
                                .catch(outCatch);
                            function addDataSetOuter(result4: string[]) {
                                expect(result4).to.deep.equal(expected3);
                                return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
                                    .then(addDatasetThen)
                                    .catch(finalPromise);
                                function addDatasetThen(result5: string[]) {
                                    expect.fail(result5, expected3, "Should not have added identical id 2");
                                }
                                function finalPromise(err2: any) {
                                    expect(err2).to.be.instanceOf(InsightError);
                                }
                            }
                            function outCatch(err1: any) {
                                expect.fail(err1, expected3, "Should not have rejected 3");
                            }
                        }
                    })
                    .catch((err: any) => {
                        expect.fail(err, expected2, "Should not have rejected 2");
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected1, "Should not have rejected");
            });
    });

    it("Should reject a non-existing rooms dataset with valid ID", function () {
        const id: string = "roomsNotExist";
        const expected: string[] = [];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect.fail(result, expected, "Should not have added non-existing dataset");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should add a rooms dataset with invalid buildings in few", function () {
        const id: string = "roomsOverallValid";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should have added valid dataset");
            });
    });

    it("Should reject a rooms dataset with no building files", function () {
        const id: string = "roomsNoBuildings";
        const expected: string[] = [];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect.fail(result, expected, "Should not have added empty dataset");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should add a rooms dataset with all garbage files", function () {
        const id: string = "roomsGarbageFiles";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect.fail(result, expected, "Should not have added empty dataset");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should add a rooms dataset with all empty building files", function () {
        const id: string = "roomsEmptyBuildings";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect.fail(result, expected, "Should not have added empty dataset");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should remove valid rooms dataset", function () {
        const id: string = "rooms";
        const collection: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect(result).to.deep.equal(collection);
                return insightFacade.removeDataset(id)
                    .then((result2: string) => {
                        expect(result2).to.deep.equal(id);
                    })
                    .catch((err: any) => {
                        expect.fail(err, id, "Should have removed valid dataset");
                    });
            })
            .catch((err: any) => {
                expect.fail(err, collection, "Should have added valid dataset");
            });
    });

    it("Should not remove valid ID not existing in rooms dataset", function () {
        const id: string = "rooms";
        const id2: string = "roomsSmaller";
        const collection: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect(result).to.deep.equal(collection);
                return insightFacade.removeDataset(id2)
                    .then((result2: string) => {
                        expect.fail(result2, "Should not have removed dataset not added");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.instanceOf(NotFoundError);
                    });
            })
            .catch((err: any) => {
                expect.fail(err, collection, "Should have added valid dataset");
            });
    });

    it("Should not remove existing rooms dataset with null id key", function () {
        const id: string = null;
        return insightFacade.addDataset(id, datasets["rooms"], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect.fail(result, "Should not have removed dataset with null id key");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should not remove existing dataset with undefined id key", function () {
        const id: string = undefined;
        return insightFacade.addDataset(id, datasets["roomsSmaller"], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect.fail(result, "Should not have removed dataset with undefined type id key");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });

    it("Should not remove invalid ID not existing in dataset", function () {
        const id: string = "rooms";
        const id2: string = "ro_oms";
        const collection: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect(result).to.deep.equal(collection);
                return insightFacade.removeDataset(id2)
                    .then((result2: string) => {
                        expect.fail(result2, "Should not have removed dataset not added");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.instanceOf(InsightError);
                    });
            })
            .catch((err: any) => {
                expect.fail(err, collection, "Should have added valid dataset");
            });
    });

    it("Should not remove invalid whitespace ID not existing in rooms dataset", function () {
        const id: string = "rooms";
        const id2: string = "   ";
        const collection: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect(result).to.deep.equal(collection);
                return insightFacade.removeDataset(id2)
                    .then((result2: string) => {
                        expect.fail(result2, "Should not have removed dataset with invalid id");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.instanceOf(InsightError);
                    });
            })
            .catch((err: any) => {
                expect.fail(err, collection, "Should have added valid dataset");
            });
    });

    it("Should reject remove dataset from empty dataset", function () {
        const id: string = "roomsExtraFolder";
        return insightFacade.removeDataset(id)
            .then((result: string) => {
                expect.fail(result, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(NotFoundError);
            });
    });

    it("Should remove valid rooms dataset while existing", function () {
        const id: string = "rooms";
        const id2: string = "rooms2";
        const expected: string[] = [id];
        const expected2: string[] = [id, id2];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
                return insightFacade.addDataset(id2, datasets["rooms"], InsightDatasetKind.Rooms)
                    .then((result2: string[]) => {
                        expect(result2).to.deep.equal(expected2);
                        return insightFacade.removeDataset(id2)
                            .then(thenInner)
                            .catch(catchInner);
                        function catchInner(err: any) {
                            expect.fail(err, id2, "Should have removed existing dataset");
                        }
                        function thenInner(result3: string) {
                            expect(result3).to.deep.equal(id2);
                        }
                    })
                    .catch((err: any) => {
                        expect.fail(err, expected2, "Should not have rejected");
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should have added valid dataset");
            });
    });


    it("List 1 rooms dataset added", function () {
        this.timeout(30000);
        const id: string = "rooms";
        const expectedAdd: string[] = [id];
        const coursesDataset: InsightDataset =
            { id: "rooms", numRows: 364, kind: InsightDatasetKind.Rooms } as InsightDataset;
        const expectedList: InsightDataset[] = [coursesDataset];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expectedAdd);
                return insightFacade.listDatasets()
                    .then((result2: InsightDataset[]) => {
                        expect(result2).to.deep.equal(expectedList);
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expectedAdd, "Should not have rejected");
            });
    });

    it("List 1 room and 1 courses datasets added", function () {
        const id: string = "courses";
        const id2: string = "rooms";
        const expectedAdd: string[] = [id];
        const expectedAdd2: string[] = [id, id2];
        const coursesDataset: InsightDataset =
            { id: "courses", numRows: 64612, kind: InsightDatasetKind.Courses } as InsightDataset;
        const roomsDataset: InsightDataset =
            { id: "rooms", numRows: 364, kind: InsightDatasetKind.Rooms } as InsightDataset;
        const expectedList: InsightDataset[] = [coursesDataset];
        const expectedList2: InsightDataset[] = [coursesDataset, roomsDataset];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expectedAdd);
                return insightFacade.listDatasets()
                    .then((result2: InsightDataset[]) => {
                        expect(result2).to.deep.equal(expectedList);
                        return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Rooms)
                            .then(then2)
                            .catch(catchInner);
                        function then2(result3: string[]) {
                            expect(result3).to.deep.equal(expectedAdd2);
                            return insightFacade.listDatasets()
                                .then(thenInner);
                            function thenInner(result4: InsightDataset[]) {
                                expect(result4).to.deep.equal(expectedList2);
                            }
                        }
                        function catchInner(err: any) {
                            expect.fail(err, expectedAdd2, "Should not have rejected 2");
                        }
                    })
                    .catch((err: any) => {
                        expect.fail(err, expectedAdd2, "Should not have rejected 2");
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expectedAdd, "Should not have rejected");
            });
    });

    it("Add and Remove and List rooms and courses datasets", function () {
        const id: string = "courses";
        const id2: string = "rooms";
        const expectedAdd: string[] = [id];
        const expectedAdd2: string[] = [id, id2];
        const coursesDataset: InsightDataset =
            { id: "courses", numRows: 64612, kind: InsightDatasetKind.Courses } as InsightDataset;
        const roomsDataset: InsightDataset =
            { id: "rooms", numRows: 364, kind: InsightDatasetKind.Rooms } as InsightDataset;
        const expectedList: InsightDataset[] = [coursesDataset];
        const expectedList2: InsightDataset[] = [coursesDataset, roomsDataset];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect(result).to.deep.equal(expectedAdd);
            return insightFacade.listDatasets().then((result2: InsightDataset[]) => {
                expect(result2).to.deep.equal(expectedList);
                return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Rooms).then(then3)
                    .catch(catch2);
                function then3(result3: string[]) {
                    expect(result3).to.deep.equal(expectedAdd2);
                    return insightFacade.listDatasets()
                        .then(thenMid);
                    function thenMid(result4: InsightDataset[]) {
                        expect(result4).to.deep.equal(expectedList2);
                        return insightFacade.removeDataset(id2)
                            .then(then2)
                            .catch(catchInner);
                        function then2(result5: string) {
                            expect(result5).to.deep.equal(id2);
                            return insightFacade.listDatasets().then(thenInner);
                            function thenInner(result6: InsightDataset[]) {
                                expect(result6).to.deep.equal(expectedList);
                            }
                        }
                        function catchInner(err: any) {
                            expect.fail(err, id2, "Should remove");
                        }
                    }
                }
                function catch2(err: any) {
                    expect.fail(err, expectedAdd2, "Should not have rejected 2");
                }
            })
                .catch((err: any) => {
                    expect.fail(err, expectedAdd2, "Should not have rejected 2");
                });
        })
            .catch((err: any) => {
                expect.fail(err, expectedAdd, "Should not have rejected");
            });
    });

    it("Add 1 rooms dataset, reject add 1 rooms dataset, then list 1 rooms dataset", function () {
        const id: string = "rooms";
        const idNotExist: string = "roomsWhatever";
        const expectedAdd: string[] = [id];
        const roomsDataset: InsightDataset =
            { id: "rooms", numRows: 364, kind: InsightDatasetKind.Rooms } as InsightDataset;
        const expectedList: InsightDataset[] = [roomsDataset];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expectedAdd);
                return insightFacade.addDataset(idNotExist, datasets[idNotExist], InsightDatasetKind.Rooms)
                    .then((result2: string[]) => {
                        expect.fail(result2, expectedAdd, "Should not have added non-existing dataset with valid ID");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.instanceOf(InsightError);
                        return insightFacade.listDatasets().then(then5);
                        function then5(result3: InsightDataset[]) {
                            expect(result3).to.deep.equal(expectedList);
                        }
                    });
            })
            .catch((err: any) => {
                expect.fail(err, expectedAdd, "Should not have rejected");
            });
    });

    it("Reject add 1 rooms dataset, then list empty dataset", function () {
        const idInvalid: string = "rooms_";
        const expectedAdd: string[] = [];
        const expectedList: InsightDataset[] = [];
        return insightFacade.addDataset(idInvalid, datasets["rooms"], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect.fail(result, expectedAdd, "Should not have added dataset with invalid ID");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
                return insightFacade.listDatasets().then((result2: InsightDataset[]) => {
                    expect(result2).to.deep.equal(expectedList);
                });
            });
    });

    it("Should reject dataset with no index file", function () {
        const id: string = "roomsNoIndex";
        const expected: string[] = [];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms)
            .then((result: string[]) => {
                expect.fail(result, expected, "Should not have added dataset without index.html file");
            })
            .catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });
});

/*
 * This test suite dynamically generates tests from the JSON files in test/queries.
 * You should not need to modify it; instead, add additional files to the queries directory.
 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
 */
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: {path: string, kind: InsightDatasetKind} } = {
        courses: {path: "./test/data/courses.zip", kind: InsightDatasetKind.Courses},
        // coursesNullKey: {path: "./test/data/coursesNullKey.zip", kind: InsightDatasetKind.Courses},
        // coursesInvalidKey: {path: "./test/data/coursesInvalidkey.zip", kind: InsightDatasetKind.Courses},
        // coursesNoValidFile: {path: "./test/data/coursesNoneValid.zip", kind: InsightDatasetKind.Courses},
        // coursesNullValue: {path: "./test/data/coursesNullValue.zip", kind: InsightDatasetKind.Courses},
        // coursesNoFiles: {path: "./test/data/coursesNoFiles.zip", kind: InsightDatasetKind.Courses},
        // coursesSomeEmpty: {path: "./test/data/coursesSomeEmpty.zip", kind: InsightDatasetKind.Courses},
        // coursesAllEmpty: {path: "./test/data/coursesAllEmpty.zip", kind: InsightDatasetKind.Courses},
        // courses2: {path: "./test/data/coursesValid2.zip", kind: InsightDatasetKind.Courses},
        // courses3: {path: "./test/data/coursesValid3.zip", kind: InsightDatasetKind.Courses},
        // coursesGarbage: {path: "./test/data/coursesHalfGarbage.zip", kind: InsightDatasetKind.Courses},
        // testJPG: {path: "./test/data/test.jpg", kind: InsightDatasetKind.Courses},
        // courseOnlyOneFile: {path: "./test/data/oneCourse", kind: InsightDatasetKind.Courses},
        // coursesFolder: {path: "./test/data/coursesFolder.zip", kind: InsightDatasetKind.Courses},
        // coursesWrongFolder: {path: "./test/data/coursesWrongFolder.zip", kind: InsightDatasetKind.Courses},
        // coursesJsonOnly: {path: "./test/data/AND.json", kind: InsightDatasetKind.Courses}
    };
    let insightFacade: InsightFacade;
    let testQueries: ITestQuery[] = [];

    // Load all the test queries, and call addDataset on the insightFacade instance for all the datasets
    before(function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = TestUtil.readTestQueries();
        } catch (err) {
            expect.fail("", "", `Failed to read one or more test queries. ${err}`);
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Will fail* if there is a problem reading ANY dataset.
        const loadDatasetPromises: Array<Promise<string[]>> = [];
        insightFacade = new InsightFacade();
        for (const id of Object.keys(datasetsToQuery)) {
            const ds = datasetsToQuery[id];
            const data = fs.readFileSync(ds.path).toString("base64");
            loadDatasetPromises.push(insightFacade.addDataset(id, data, ds.kind));
        }
        return Promise.all(loadDatasetPromises);
        // .catch((err) => {
        //     /* *IMPORTANT NOTE: This catch is to let this run even without the implemented addDataset,
        //      * for the purposes of seeing all your tests run.
        //      * TODO For C1, remove this catch block (but keep the Promise.all)
        //      */
        //     return Promise.resolve("HACK TO LET QUERIES RUN");
        // });
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries.
    // Creates an extra "test" called "Should run test queries" as a byproduct.
    it("Should run test queries", function () {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, function (done) {
                    const resultChecker = TestUtil.getQueryChecker(test, done);
                    insightFacade.performQuery(test.query)
                        .then(resultChecker)
                        .catch(resultChecker);
                });
            }
        });
    });
});
