// Load required node modules.
const https = require('https');

// Load required custom errors.
const ArgumentError = require('./errors.js').ArgumentError;
const HTTPError = require('./errors.js').HTTPError;

// Define remote web service url.
const reqURL = 'https://us-central1-dpduk-s-test-d1.cloudfunctions.net/parcels/';

class RouteServiceProvider {
    constructor(token, requestsLimit, onReattempting) {
        // Validate that provided object has a required property to be used as a authorization token and throw appropriate exception if it doesn't.
        if (!token.hasOwnProperty('Authorization'))
            throw new ArgumentError(`RouteServiceProvider object failed to initialize as provided token instance is not an object containing 'Authorization' property and as such cannot be used. Please provide valid token.`, token);

        // Check whether provided request limit is of a number Type and throw appropriate exception if its not.
        if (typeof requestsLimit !== 'number')
            throw new TypeError('RouteServiceProvider object failed to initialize as provided \'requestsLimit\' argument is not of a valid number type.');

        // Check whether provided request limit is greater than one and throw appropriate exception if its not.
        if (requestsLimit < 1)
            throw new ArgumentError('RouteServiceProvider object failed to initialize as provided \'requestsLimit\' argument is less than 1. Please provide number greater than 1 instead.', requestsLimit);

        // Check whether provided onReattempting argument can be use as a callback and throw appropriate exception if it can't.
        if (typeof onReattempting !== 'function')
            throw new TypeError('RouteServiceProvider object failed to initialize as provided \'onReattempting\' argument is not a function ans as such cannot be used as a callback.');

        // Http request options.
        this.reqOptions = { headers: token };

        // Limit of concurrent http requests.
        this.requestsLimit = requestsLimit;

        // Concurrent http requests counter.
        this.requestsCount = 0;

        // On reattempting http request callback.
        this.onReattempting = onReattempting;
    }

    // Obtains and updates route detail for all the provided parcels.
    async refreshParcelsRouteDetails(parcels) {

        // Return promises of obtaining and updating route details for all provided parcels.
        let promises = parcels.map(async (parcel) => {
            // Declare attempt counter variable. 
            let attemptCount = 0;

            // Re-attempt till successfully, or till error get re-throw.
            while (true) {

                // While number of currently handled requests is greater or equal to the provider requests limit delay next request by 100 ms.
                while (this.requestsCount >= this.requestsLimit) await delay(100);
                // Increase ongoing request counter by 1;
                this.requestsCount++;

                // Return promise of obtaining and updating parcel route details.
                try { return await refreshParcelRouteDetails(parcel, this.reqOptions); }
                // Retry or await to re-throw the error.
                catch (error) {
                    // If error caught is indicating that the problem occurred on the server side ..
                    if (error.code == "ECONNRESET" || error.code == "ETIMEDOUT" || (error instanceof HTTPError && error.statusCode >= 500)
                        // .. and number of re-attempts is less than 10.
                        && attemptCount < 10) {
                        // Increase attemptCount
                        attemptCount++;
                        // Delay next attempt by one second.
                        await delay(1000);
                        // Execute onRetrying callback.
                        this.onRetrying(parcel.number, error, attemptCount);
                        // Otherwise re-throw caught error.
                    } else { throw error; }
                    // Finally decrease ongoing requests counter by 1;
                } finally { this.requestsCount--; }
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