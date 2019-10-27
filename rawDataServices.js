// Load required modules
const fs = require('fs');
const path = require('path');

// Load required custom errors
const ArgumentError = require('./errors.js').ArgumentError;

// Load custom modules
const Parcel = require('./parcel.js');
const Postcode = require('./postcode.js');
const Depot = require('./depot.js');

// Authorization bearer token path.
const reqTokenPath = 'token.json';

// Returns authorization token.
function getToken() {
    // Gets authorization token Buffer from the file. 
    const tokenBuffer = fs.readFileSync(reqTokenPath);

    // Decode obtained token buffer into the JSON string.
    const tokenStr = tokenBuffer.toString('utf-8');

    // Decode token buffer into the token object, and return it.
    return JSON.parse(tokenStr);
} module.exports.getToken = getToken;

// Returns the buffer containing the data read from the file located on the provided path.
function getRawData(filePath) {
    // Return the promise of retrieving parcels raw data from the file.
    return new Promise((resolve, reject) => {
        // Check whether provided 'filePath' argument is a string and throw appropriate exception if it's not.
        if (typeof(filePath) !== 'string') reject(new TypeError(`Provided file path ${filePath} is not string.`));

        // Load file from the provided file path
        fs.readFile(filePath, (error, data) => {
            // If error is truthy, reject the promise.
            if (error) { reject(error); }
            // Otherwise assign value of obtained data to the local variable parcelsRawData.
            parcelsRawData = data;
            resolve(data);
        });
    });
} module.exports.getRawData = getRawData;

// Returns promise of storing the provided depot into the JSON file and returning its path.
function saveDepotToJSON(depot) {

    // Validate whether the argument is a Buffer, and throw appropriate exception if its not.
    if (!depot instanceof Depot) throw new TypeError('Provided \'depot\' argument is not a valid instance of a Depot class. Please provide valid Depot object.');

    // Build absolute file path based on the depot name.
    let filePath = path.resolve(`./${depot.name}.json`);

    // Return promise of storing the depot into the JSON file.
    return new Promise((resolve, reject) => {
        // Save the depot instance as a JSON file.
        fs.writeFile(filePath, JSON.stringify(depot), 'utf8', (error) => {
            // If error is truthy, print appropriate info into the console and reject the promise.
            if (error) { reject(error); }
            // Otherwise resolve the promise providing absolute path to the file in which depot has been saved as a return argument.
            resolve(filePath);
        });
    });
} module.exports.saveDepotToJSON = saveDepotToJSON;

// Retrieves Parcel[] build based on the provided parcelRawData
function decodeParcelsFromRawData(bufferData) {

    // Validate whether the argument is a Buffer, and throw appropriate exception if its not.
    if (!bufferData instanceof Buffer) throw new TypeError('Provided \'bufferData\' argument is not of a required Buffer type.');

    // Convert get parcels raw data as a string from the data buffer.
    let data = bufferData.toString('utf-8');

    // Declare parcels array.
    let parcels = [];

    // Normalize parcels raw data by removing the title row from it.
    data = normalizeParcelsRawData(data);

    // Keep looping till all the parcels raw data has been processed.
    while (true) {
        // Get index of the first 'return' escape character
        let lineEndsIndex = data.indexOf('\r');

        // Declare variable which will to store the data associated with a single parcel.
        let parcelData;

        // If 'return' character has been found in the remaining parcels raw data ..
        if (lineEndsIndex !== -1)
            // .. slice out data associated with a single parcel.
            parcelData = data.slice(1, lineEndsIndex);
        // Otherwise as is nothing to slice out ..
        else {

            // .. simply assign value of data to into parcelData variable ..
            parcelData = data;
            // .. and break out of the loop.    
            break;
        }

        // Gets parcel from parcel raw data.
        let parcel = decodeParcelFromRawData(parcelData);

        // Add constructed parcel instance into the parcels container.
        parcels.push(parcel);

        // Remove raw data associated with already constructed parcel.
        data = data.slice(lineEndsIndex + 1);
    }

    // Return Parcel[] containing all the constructed parcels.
    return parcels;
} module.exports.decodeParcelsFromRawData = decodeParcelsFromRawData;

// Retrieves instance of a Parcel class build based on provided parcel raw data.
function decodeParcelFromRawData(parcelRawData) {

    // Find index of the first comma separating parcel number from delivery date within the parcel raw data
    let firstSeparatorIndex = parcelRawData.indexOf(',');

    // Find index of the second comma separating delivery date from the postcode within the parcel raw data
    let secondSeparatorIndex = parcelRawData.lastIndexOf(',');

    // Slice parcel raw data into separate attributes
    let parcelNumber = parcelRawData.slice(0, firstSeparatorIndex);
    let deliveryDateStr = parcelRawData.slice(firstSeparatorIndex + 1, secondSeparatorIndex);
    let postcodeStr = parcelRawData.slice(secondSeparatorIndex + 1);

    // Construct Date object from the delivery date string.
    let deliveryDate = new Date(deliveryDateStr);
    let postcode = new Postcode(postcodeStr);

    // Constructs and return the Parcel instance.
    return new Parcel(parcelNumber, deliveryDate, postcode);
}

// Returns normalized, title-row free parcels data
function normalizeParcelsRawData(parcelsRawData) {

    // Gets index of the first 'return' escape character
    let titleRowEndsIndex = parcelsRawData.indexOf('\r');

    // Slices out the title row and returns normalized parcels raw data.
    return parcelsRawData.slice(titleRowEndsIndex + 1);
}

