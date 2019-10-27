// Load required custom errors
const ArgumentError = require('./errors.js').ArgumentError;

// Load required custom modules
const Postcode = require('./postcode.js');

class Parcel {
    constructor(number, deliveryDate, postcode) {

        // Check whether the provided 'number' is a valid parcel number ..
        if (!isValidParcelNumber(number)) {
            // .. and throw appropriate exception if its not.
            throw new ArgumentError(`Provided argument 'number': ${number} is invalid. Please provide string containing non-negative integer instead.`, number);
        }
        // Check whether the provided 'deliveryDate' is of expected type and throw appropriate exception if it's not.
        else if (!deliveryDate instanceof Date) { throw new TypeError('Provided argument \'deliveryDate\' is not instance of Date class.'); }        
        // Check whether the provided 'deliveryDate' is representing valid date and throw appropriate exception if it doesn't.
        else if (isNaN(deliveryDate)) { throw new ArgumentError('Provided argument \'deliveryDate\' is an invalid instance of Date class. Please provide valid Date instance.', deliveryDate); }
        // Check whether the provided 'postcode' is of expected type and throw appropriate exception if it's not.
        else if (!postcode instanceof Postcode) { throw new TypeError('Provided argument \'postcode\' is not a valid instance of Postcode class.'); }

        // Assigns values of the instance properties.

        // The uniq id number.
        this.number = number;

        // The date the parcel suppose to be delivered.
        this.deliveryDate = deliveryDate;

        // The postcode of the parcel delivery address.
        this.postcode = postcode;

        // The Id of the route which parcel has been allocated to.
        this.route = null;

        // Estimated time of arrival to the destination address.
        this.eta = null;
    }
}
module.exports = Parcel;

// Returns true if provided number is an integer greater or equal to 0. Otherwise returns false.
function isValidParcelNumber(number) {

    // If provided number is not an integer return false ..
    if (!Number.isInteger(+number)) return false;

    // Returns true if number is greater or equal to 0. Otherwise return false.
    return number >= 0;
}