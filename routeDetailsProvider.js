// Load required node modules.
const https = require('https');

// Load required custom errors.
const ArgumentError = require('./errors.js').ArgumentError;
const HTTPError = require('./errors.js').HTTPError;

// Define remote web service url.
const reqURL = 'https://us-central1-dpduk-s-test-d1.cloudfunctions.net/parcels/';

class RouteServiceProvider {
    constructor(token, onRetrying) {
        // Validate that provided object has a required property to be used as a authorization token, and throw appropriate exception if it doesn't.
        if (!token.hasOwnProperty('Authorization'))
            throw new ArgumentError(`RouteServiceProvider object failed to initialize as provided token instance is not an object containing 'Authorization' property and as such cannot be used. Please provide valid token.`);

        // Check whether provided onRetrying argument can be use as a callback and throw appropriate exception if it can't.
        if (typeof onRetrying !== 'function')
            throw new TypeError('RouteServiceProvider object failed to initialize as provided \'onRetrying\' argument is not a function ans as such cannot be used as a callback.');

        this.reqOptions = { headers: token };
        this.onRetrying = onRetrying;
    }

    // Obtains and updates route detail for all the provided parcels.
    async refreshParcelsRouteDetails(parcels) {

        // Loop through all the provided parcels and update each with eta and route number.
        let promises = parcels.map(async (parcel) => {

            // Declare attempt counter variable. 
            let attemptCount = 0;

            // Re-attempt till successfully, or till error get re-throw.
            while (true) {
                // Obtain parcel current eta and route number from the server and update parcel instance with these data.
                try { return await refreshParcelRouteDetails(parcel, this.reqOptions); }
                // Retry or await to re-throw the error.
                catch (error) {
                    // If error caught is indicating that the problem occurred on the server side ..
                    if (error.code == "ECONNRESET" || error.code == "ETIMEDOUT" || (error instanceof HTTPError && error.statusCode >= 500)
                        // .. and number of re-attempt is less than 10.
                        && attemptCount < 10) {
                        // Increase attemptCount
                        attemptCount++;
                        // Execute onRetrying callback.
                        this.onRetrying(parcel.number, error, attemptCount);
                        // Delay next attempt by one second.
                        await delay(1000);
                        // Otherwise re-throw caught error.
                    } else { throw error; }
                }
            }
        });
        // Await till all parcels gonna be looped through.
        await Promise.all(promises);

    }
} module.exports = RouteServiceProvider;

// Returns promise of obtaining most recent route details associated with the provided parcel and updates parcel instance accordingly.
function refreshParcelRouteDetails(parcel, reqOptions) {
    // Return new Promise of refreshing parcel details.
    return new Promise((resolve, reject) => {

        // Construct request URL for provided parcel.
        const parcelReqURL = reqURL + parcel.number;

        // Send HTTPS GET request
        https.get(parcelReqURL, reqOptions, (response) => {

            // De-structure response details.
            const { statusCode } = response;
            const contentType = response.headers['content-type'];

            // Declare error container variable.
            let error;

            // If response status code is not 'OK', construct appropriate HTTPError
            if (statusCode !== 200)
                error = new HTTPError(`Request Failed.\n Status Code: ${statusCode}`, statusCode, parcelReqURL, reqOptions);
            // Otherwise if response contains content-type other then expected, throw appropriate Error.
            else if (!/^application\/json/.test(contentType))
                error = new Error(`Invalid content-type.\n Expected application/json but received ${contentType}`);

            // On error ..
            if (error) {
                // .. consume response data to free up memory ..
                response.resume();
                // .. and reject the promise providing error as a rejection argument.
                reject(error);
            }

            // On success - decode object from response and use it to update the parcel route details accordingly.
            processResponse(parcel, response, resolve, reject);

            // On https.get 'error' event occurring, take an error and provided as a argument while rejecting the promise.
        }).on('error', (e) => { reject(e); });
    });
}

// Process the response and used processed data to update provided parcel route details.
function processResponse(parcel, response, resolve, reject) {

    // Set response encoding to utf-8.
    response.setEncoding('utf8');

    // Declare raw data container variable.
    let rawData = '';

    // Each time when response 'data' event occurred, add chunk of data to raw data container.
    response.on('data', (chunk) => { rawData += chunk; });

    // When response 'end' event occurred ..
    response.on('end', () => {
        try {
            // .. construct route details object from rawData json string ..
            const routeDetails = JSON.parse(rawData);

            // .. and transfer appropriate values from the object onto the parcel itself.
            parcel.eta = routeDetails.eta;
            parcel.route = routeDetails.route;

            // If error occurred, reject the promise providing error as rejection argument.
        } catch (err) { reject(err); }

        // When successfully process the response resolve the promise.
        resolve();
    });

}

// Returns a promise which resolves after provided number of millisecond.
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}