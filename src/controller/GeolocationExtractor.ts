import Log from "../Util";
import * as http from "http";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class GeolocationExtractor {
    private lat: number;
    private lon: number;
    private error: boolean;

    constructor() {
        Log.trace("Looking for room's Geolocation!");
        this.lat = null;
        this.lon = null;
        this.error = null;
    }

    public parseGeo(roomAddress: string, webService: string) {
        http.get(webService, (res) => {
            let encodedURL: string = encodeURI(roomAddress);
            const { statusCode } = res;
            const contentType = res.headers["content-type"];

            let error;
            if (statusCode !== 200) {
                error = new Error("Request Failed.\n" +
                    `Status Code: ${statusCode}`);
            } else if (!/^application\/json/.test(contentType)) {
                error = new Error("Invalid content-type.\n" +
                    `Expected application/json but received ${contentType}`);
            }
            if (error) {
                Log.error(error.message);
                // Consume response data to free up memory
                res.resume();
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
                } catch (e) {
                    Log.error(e.message);
                }
            });
        }).on("error", (e) => {
            Log.error(`Got error: ${e.message}`);
        });
    }
}
