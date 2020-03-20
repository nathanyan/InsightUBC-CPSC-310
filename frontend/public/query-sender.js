/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */
CampusExplorer.sendQuery = function (query) {
    return new Promise(function (fulfill, reject) {
        let xmlHttpRequest = new XMLHttpRequest();
        xmlHttpRequest.open("POST", "/query");
        xmlHttpRequest.onload = function () {
            // Check status
            if (xmlHttpRequest.status === 200) {
                // Resolve the promise with the response
                fulfill(JSON.parse(xmlHttpRequest.response));
            } else {
                // Otherwise reject with status text
                reject(Error(xmlHttpRequest.statusText));
            }
        };

        // Handle network errors
        xmlHttpRequest.onerror = function () {
            reject(Error("error"));
        };

        // Make the request
        xmlHttpRequest.send(JSON.stringify(query));
    });
};
