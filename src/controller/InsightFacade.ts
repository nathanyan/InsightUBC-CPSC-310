import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, ResultTooLargeError} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
import PerformQueryValid from "./PerformQueryValid";
import PerformQueryFilterDisplay from "./PerformQueryFilterDisplay";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    private addedData: any;
    private uniqueIDsInQuery: any[];

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.addedData = {};
        this.uniqueIDsInQuery = [];
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        return Promise.reject("Not implemented.");
    }

    public removeDataset(id: string): Promise<string> {
        return Promise.reject("Not implemented.");
    }

    // performs a query on the dataset.    --> Take dataset from object/data structure
    // It first should parse     -->  Correct query = JSON object  //   parse JSON —> what query is asking
    // and validate the input query,     --> validate = syntax checking (ie: brackets)
    // then perform semantic checks on the query and evaluate the query if it is valid. --> - Semantic: words correct
    // A result should have a max size of 5,000.
    // If this limit is exceeded the promise should reject with a ResultTooLargeError.
    // Translate: Something similar to dept means dept —> Yuree is formatting —>
    //            should be in proper format with the 10 keys only.
    // Start with simple query —> WHERE: has an object —> pull the courses that match this description
    //                            —> get this to work, then expand

    public performQuery(query: any): Promise <any[]> {
        return new Promise((resolve, reject) => {
            if (!PerformQueryValid.isQueryValid(query, this.addedData, this.uniqueIDsInQuery)) {
                reject(new InsightError("Query is invalid"));
            }
            let idToQuery: string = this.uniqueIDsInQuery[0];           // only 1 id in uniqueIDsInQuery = one to query
            // let datasetToParse: any[] = [];
            // try {
            //     const content = fs.readFileSync("./data/" + idToQuery, "utf8");
            //     datasetToParse = JSON.parse(content);
            // } catch {
            //     reject(new InsightError("File invalid"));
            // }
            let datasetToParse: any[] = this.addedData[idToQuery];      // the only dataset we need to look at
            let resultSoFar: any[] = [];
            let where: any = query["WHERE"];
            resultSoFar = PerformQueryFilterDisplay.filterCourseSections(datasetToParse, where);
            // query course sections out
            if (resultSoFar.length > 5000) {
                reject (new ResultTooLargeError("Result exceeds 5000"));
            }
            let options: any = query["OPTIONS"];
            let finalResult: any[];
            finalResult = PerformQueryFilterDisplay.displayByOptions(resultSoFar, options);
            // display the filtered results accordingly
            this.uniqueIDsInQuery.pop();
            Log.trace(finalResult);
            resolve(finalResult);
        });
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.reject("Not implemented.");
    }
}
