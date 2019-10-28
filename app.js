// Load required node modules.
const process = require('process');
const path = require('path');

// Load required custom errors
const ArgumentError = require('./errors.js').ArgumentError;

// Load required custom modules
const rawDataServices = require('./rawDataServices.js');
const RouteDetailsProvider = require('./routeDetailsProvider.js');
const ParcelsSorter = require('./parcelsSorter.js');
const Postcode = require('./postcode.js');
const Depot = require('./depot.js');

// Construct a parcel sorter.
const parcelsSorter = new ParcelsSorter();

// Construct route details provider.
let routeDetailsProvider;
try { routeDetailsProvider = new RouteDetailsProvider(rawDataServices.getToken(), printReattemptLog); }
catch (error) {
    // If error is of a type of Type error re-throw and let application fail.
    if (error instanceof TypeError) throw error;

    // Otherwise print the error into the console.
    console.log('\n\033[41mApplication encountered a problem with obtaining remote service authorization token from the file and must stop. \nPlease see exception details below:\033[0m');
    console.log(error.stack);
    // Ends application execution
    return;
}

// Construct depots.
const depots = [    
    new Depot('Birmingham', [new Postcode("B?? ???"), new Postcode("TF? ???"), new Postcode("DY? ???"), new Postcode("WV? ???")]),
    new Depot('Leeds', [new Postcode("WF16 ???"), new Postcode("BD?? ???"), new Postcode("LS?? ???")]),
    new Depot('Wakefield', [new Postcode("WF1 ???"), new Postcode("WF2 ???"), new Postcode("WF3 ???"), new Postcode("WF4 ???"), new Postcode("HD? ???")])
];

// Wrap the rest of the logic in async iffy to allow asynchronous behavior within.
(async function () {
    // Get value of the file path from the 3rd command line argument.
    const filePath = process.argv[2];

    // Construct an instance of a Date object based on 4th command line argument.
    const date = new Date(process.argv[3]);

    // If provided date argument doesn't represent valid Date instance.
    if ((!date instanceof Date) || isNaN(date)) {
        // Print the error into the console.
        console.log('\n\033[41mApplication encountered a problem with provided console execution parameter and must stop. \nPlease see exception details below:\033[0m');
        console.log(new ArgumentError(`Provided argument: ${process.argv[3]} is not a string in a format correct to be used for construction of a Date object. \nPlease provide string in a correct format YYYY-MM-DD.`).stack);
        // Ends application execution
        return;
    }

    // Attempt to get parcels raw data buffer from the file.
    let rawDataBuffer;
    try { rawDataBuffer = await rawDataServices.getRawData(filePath); }
    catch (error) {
        // Print the error into the console.
        console.log('\n\033[41mApplication encountered a problem with obtaining data from the file and must stop. \nPlease see exception details below:\033[0m');
        console.log(error.stack);
        // End application execution
        return;
    }

    // Decode parcels raw data buffer into Parcel[].
    let parcels = rawDataServices.decodeParcelsFromRawData(rawDataBuffer);

    // Filter out parcels not due to delivery on the provided date.
    parcels = parcelsSorter.getToBeDeliverParcels(parcels, date);

    // Allocate parcels into the correct delivery depot.
    parcelsSorter.allocateParcelsToDepots(parcels, depots);

    // Get promises of obtaining and updating route details for all the parcels allocated to all the depots.
    let promises = depots.map((depot) => {
        // Return promise of obtaining and updating route details for all the parcels in the currently looped through depot.
        return routeDetailsProvider.refreshParcelsRouteDetails(depot.parcels);
    });

    // Await until route detail will be obtained and updated for each parcel in each depot.
    try { await Promise.all(promises); }
    catch (error) {
        // Print the error into the console.
        console.log('\n\033[41mApplication encountered problem with obtaining data from the server and must stop. \nPlease see exception details below:\033[0m');
        console.error(error.stack);
        // End application execution
        return;
    }

    // Get promises of storing all depots objects in a JSON file per depot and return array of created file paths.
    promises = depots.map((depot) => {
        // Return promise of saving depot instance into the JSON file.
        return rawDataServices.saveDepotToJSON(depot);
    });


    // Await until each depot will be stored into the JSON file.
    try { await Promise.all(promises); }
    catch (error) {
        // Print the error into the console.
        console.log('\n\033[41mApplication encountered problem with storing data into the file and must stop. \nPlease see exception details below:\033[0m');
        console.error(error);
        // End application execution
        return;
    }

    // Print to the console information about successful completion of the task.
    console.log('\033[30m\033[42mApplication execution completed successfully.\033[0m \nThe data has been stored in the files located on the paths listed below:');

    // Print paths to all files in which data has been stored.
    for await (depotFilePath of promises) {
        console.log(`  ${depotFilePath}`);
    }
})();

// Prints retrieving parcels route details 'failed and will be re-attempted' log.
function printReattemptLog(parcelNumber, error, attemptsCount) {
    console.log('\033[30m\033[43m' + `Retrieving route details for parcel number: ${parcelNumber} failed ${attemptsCount}`
        + ` ${attemptsCount === 1 ? 'time' : 'times'} and it will be re-attempted.\n${error}` + '\033[0m');
}