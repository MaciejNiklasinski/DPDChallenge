// Load required custom errors
const ArgumentError = require('./errors.js').ArgumentError;

// Load required custom modules
const Postcode = require('./postcode.js');

class Depot {
    constructor(name, coveredPostcodes) {
        // If provided depot name is not a string, throw appropriate exception.
        if (typeof name !== 'string') throw new TypeError('Provided \'name\' argument is not of required type. Please provide string value instead.');
        
        // If provided argument 'coveredPostcodes' is not an array, throw appropriate exception.
        if (!Array.isArray(coveredPostcodes)) throw new TypeError('Provided \'coveredPostcodes\' argument is not an array. Please provide Postcode[] instead.');

        // Validate that provided 'coveredPostcodes' array is containing only an instances of Postcode class ..
        if (coveredPostcodes.some(coveredPostcode => !(coveredPostcode instanceof Postcode)))
            // .. and throw appropriate exception if its otherwise.
            throw new ArgumentError('Provided argument \'coveredPostcode\' array is not an array containing exclusively instances of the Postcode class.'
            + 'Please provide valid Postcode[] instead.', parcels);        

        // The depot name.
        this.name = name;

        // The array of postcodes covered by the depot.
        this.coveredPostcodes = coveredPostcodes;   

        // Empty Parcel[] container.
        this.parcels = [];
    }
}
module.exports = Depot;