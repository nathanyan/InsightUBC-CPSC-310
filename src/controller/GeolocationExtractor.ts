import Log from "../Util";
import * as http from "http";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class GeolocationExtractor {

    constructor() {
        Log.trace("Looking for room's Geolocation!");
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
                    if (statusCode !== 200) {
                        error = new Error("Request Failed.\n" + `Status Code: ${statusCode}`);
                    } else if (!/^application\/json/.test(contentType)) {
                        error = new Error("Invalid content-type.\n" +
                            `Expected application/json but received ${contentType}`);
                    }
                    if (error) {
                        Log.error(error.message);
                        // Consume response data to free up memory
                        res.resume();
                        // changed this line to reject with an error instead of just return so that can handle in caller
                        reject(error);
                        return;
                    }

                    res.setEncoding("utf8");
                    let rawData = "";
                    res.on("data", (chunk) => {
                        rawData += chunk;
                    });
                    res.on("end", () => {
                        try {
                            const parsedData = JSON.parse(rawData);
                            Log.trace(parsedData);
                            resolve(parsedData);
                        } catch (e) {
                            Log.error(e.message);
                            reject(e);
                            return;
                        }
                    });
                }).on("error", (e) => {
                    Log.error(`Got error: ${e.message}`);
                    reject(e);
                    return;
                });
            });
    }
}
