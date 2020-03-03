import GeolocationExtractor from "./GeolocationExtractor";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class GeoParse {

    constructor() {
        //
    }

    public callGeolocater(roomAddress: string): any {
        let geoExtractor: GeolocationExtractor = new GeolocationExtractor();
        return new Promise((resolve, reject) => {
            geoExtractor.parseGeo(roomAddress).then((result: any) => {
                resolve(result);
            }).catch((error: any) => {
                reject(error);
            });
        });
    }
}
