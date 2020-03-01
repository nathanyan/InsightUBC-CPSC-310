import Log from "../Util";
import GeolocationExtractor from "./GeolocationExtractor";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class GeoParse {

    constructor() {
        Log.trace("Calling GeoLocationExtractor!");
    }

    public callGeolocater(roomAddress: string): any {
        let geoExtractor: GeolocationExtractor = new GeolocationExtractor();
        let geoResponseResult: {} = null;
        geoExtractor.parseGeo(roomAddress).then((result: any) => {
            let lat: number = result["lat"];
            let lon: number = result["lon"];
            geoResponseResult = {roomLat: lat, roomLon: lon};
            return geoResponseResult;
        }).catch((error: any) => {
            return null;
        });
    }
}
