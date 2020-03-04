import Log from "../Util";
import * as http from "http";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class GeolocationExtractor {

    constructor() {
        //
    }

    // use promise resolve and reject here, and then in caller use promise.then and .catch, but will probably need
    // promise.all
        public parseGeo(roomAddress: string): Promise<any> {
            let urlEncoded: string = encodeURI(roomAddress),
                webService: string = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team020/" + urlEncoded;
            return new Promise((resolve, reject) => {
                http.get(webService, (res) => {
                    const { statusCode } = res;
                    const contentType = res.headers["content-type"];

                    let error;
                    if (statusCode !== 200 && statusCode !== 404) {
                        error = new Error("Request Failed.\n" + `Status Code: ${statusCode}`);
                    } else if (!/^application\/json/.test(contentType)) {
                        error = new Error("Invalid content-type.\n" +
                            `Expected application/json but received ${contentType}`);
                    }
                    if (error) {
                        Log.error(error.message);
                        // Consume response data to free up memory
                        res.resume();
                        return reject(error);
                    }

                    res.setEncoding("utf8");
                    let rawData = "";
                    res.on("data", (chunk) => {
                        rawData += chunk;
                    });
                    res.on("end", () => {
                        try {
                            let parsedData = JSON.parse(rawData);
                            Log.trace(parsedData);
                            return resolve(parsedData);
                        } catch (e) {
                            Log.error(e.message);
                            return reject(e);
                        }
                    });
                }).on("error", (e) => {
                    Log.trace(`Failed request with: ${webService}`);
                    Log.error(`Got error: ${e.message}`);
                    return reject(e);
                });
            });
    }
}
