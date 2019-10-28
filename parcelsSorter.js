// Load required custom errors
const ArgumentError = require('./errors.js').ArgumentError;

// Load required custom modules
const Depot = require('./depot.js');
const Parcel = require('./parcel.js');

class ParcelsSorter {
    // Allocates the parcels into the depot covering the area where the parcel is addressed to.
    allocateParcelsToDepots(parcels, depots) {

        // Validate method arguments
        if (!Array.isArray(parcels)) throw new TypeError('Provided argument \'parcels\' is not a valid Array. Please provide Parcel[] instead.');
        if (!Array.isArray(depots)) throw new TypeError('Provided argument \'depots\' is not a valid Array. Please provide Depot[] instead.');

        // For each parcel ..
        parcels.forEach((parcel) => {

            // If currently looped through entry in 'parcels' array is not of 'Parcel' type throw appropriate exception.
            if (!parcel instanceof Parcel) throw new ArgumentError('Provided argument \'parcels\' array is not an array containing exclusively instances of the Parcel class.'
                + 'Please provide valid Parcel[] instead.', parcels);

            // .. loop through all the depots ..
            depots.forEach((depot) => {

                // If currently looped through entry in 'depots' array is not of 'Depot' type throw appropriate exception.
                if (!depot instanceof Depot) throw new ArgumentError('Provided argument \'depots\' is not an array containing exclusively instances of the Depot class.'
                    + 'Please provide valid Depot[] instead.', depots);

                // .. and if the parcel postcode is within depot covered zone ..
                if (isWithinCoveredZone(depot.coveredPostcodes, parcel.postcode))
                    // .. add the parcel into the depot parcels array.
                    depot.parcels.push(parcel);

            });
        });
    }

    // Takes Parcel[] and filters out all the parcels not due for delivery on the specified date, then returns the filtered array.    
    getToBeDeliverParcels(parcels, date) {
        // Validate method arguments
        if (!Array.isArray(parcels)) throw new TypeError('Provided argument \'parcels\' is not a valid Array. Please provide Parcel[] instead.');
        if (!date instanceof Date) throw new TypeError(`Provided argument \'date\': ${date} is not Date. Please provide Date instance instead.`);

        // Returns parcels designated for the delivery on the provided date.
        return parcels.filter((parcel) => {
            // If currently looped through entry in 'parcels' array is not of 'Parcel' type throw appropriate exception.
            if (!parcel instanceof Parcel) throw new ArgumentError('Provided argument \'parcels\' is not an array containing exclusively instances of the Parcel class.'
                + 'Please provide valid Parcel[] instead.', parcels);

            // Returns true if parcel is designated ot go out for the delivery on the specified date. Otherwise returns false
            return isDueForDelivery(parcel, date);
        });
    }
} module.exports = ParcelsSorter;

// Returns true if provided postcode instance happened to be within the covered zone. Otherwise returns false.
function isWithinCoveredZone(coveredZone, postcode) {
    return coveredZone.some(coveredPostcode => coveredPostcode.isEqualOrWildcard(postcode));
}

// Returns true if both parcel delivery date and date to compare referring to the same Year, Month and Day. Otherwise returns false.
function isDueForDelivery(parcel, date) {
    return parcel.deliveryDate.getFullYear() === date.getFullYear()
        && parcel.deliveryDate.getMonth() === date.getMonth()
        && parcel.deliveryDate.getDate() === date.getDate();
}