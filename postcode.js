// Load custom errors
const ArgumentError = require('./errors.js').ArgumentError;

class Postcode {
    constructor(postcodeStr) {
        // Validates 'postcodeStr' type and throw appropriate exception if incorrect.
        if (typeof (postcodeStr) !== 'string') throw new TypeError('Provided \'postcodeStr\' must be a string.');
        // Check if the format of the postcode string is valid and throw appropriate exception if its not.
        if (!isValidPostcode(postcodeStr)) throw new ArgumentError(`Provided \'postcodeStr\': ${postcodeStr} is not a string in a valid postcode format.`, postcodeStr);

        // Assures that all the postcode string characters are capital, and stores it as 'string' property.
        this.string = postcodeStr.toUpperCase();

        // Get index of the first ' ' white space.
        const separatorIndex = this.string.indexOf(' ');

        // Slice out and assign an outward part of the postcode string.
        this.outward = this.string.slice(0, separatorIndex);

        // Find index of the first digit in an 'outward' part of the postcode string.
        const outwardDigitIndex = getIndexOfFirstDigit(this.outward);

        // Find index of the first wildcard char in an 'outward' part of the postcode string.
        const wildcardStartIndex = getIndexOfFirstWildcard(this.string);

        // Confirm that the postcode does not contain any other non-wildcard characters,
        // indexed to the greater value than the wildcardStartIndex.
        if (wildcardStartIndex !== -1 && includesWildcardAfterIndex(this.string, wildcardStartIndex))
            throw new ArgumentError(`Provided \'postcodeStr\': ${postcodeStr} is not a string in a valid postcode format.`, this.string);

        // If postcode contains a digit in a 'outward' section of the postcode ..
        if (outwardDigitIndex !== -1) {
            // Slice out and assign an area part of postcode string
            this.area = this.outward.slice(0, outwardDigitIndex);

            // Slice out and assign a district part of postcode string
            this.district = this.outward.slice(outwardDigitIndex);

            // If postcode does not contain a digit in a 'outward' section of the postcode ..
        } else if (wildcardStartIndex !== -1
            // .. and the wildcard character occurs in an 'outward' section of the postcode.
            && wildcardStartIndex < separatorIndex) {

            // Slice out and assign an area part of postcode string
            this.area = this.outward.slice(0, wildcardStartIndex);

            // Slice out and assign a district part of postcode string
            this.district = this.outward.slice(wildcardStartIndex);
        }

        // Slice out and assign an inward part of the postcode string.
        this.inward = this.string.slice(separatorIndex + 1);

        // Slice out and assign a sector part of postcode string
        this.sector = this.inward.slice(0, 1);

        // Slice out and assign a unit part of postcode string
        this.unit = this.inward.slice(1);
    }

    // Overrides default object toString method.
    toString() {
        return this.string;
    }

    // Returns true if provided postcode is either equal, or contained within the same zone (specified by wildcard characters) as the current postcode.
    isEqualOrWildcard(postcodeToCompare) {
        // If provided postcodeToCompare is not an instance of Postcode class throw appropriate exception.
        if (!postcodeToCompare instanceof Postcode)
            throw new TypeError('Provided \'postcodeToCompare\' argument is not of required type. Please provide an instance of Postcode class instead.');

        // Compare 'area' section of the postcode(no wildcards allowed).
        if (this.area !== postcodeToCompare.area)
            return false;

        // Compare 'district' section of the postcode.

        // If neither this postcode nor postcode to compare contains wildcard character in the 'district' section of the postcode ..
        if (!includesWildcard(this.district) && !includesWildcard(postcodeToCompare.district)
            // .. and length of these sections are not equal ..
            && (this.district.length !== postcodeToCompare.district.length))
            // .. return false.
            return false;

        // Loop through each character in this postcode 'district' section.
        for (i in this.district)
            // If character located under the provided index in either of postcodes 'district' section is a wildcard ..
            if (this.district[i] === '?' || postcodeToCompare.district[i] === '?')
                // .. return true.
                return true;
            // Else if character located under the provided index in this postcode and postcodeToCompare are not equal ..
            else if (this.district[i] !== postcodeToCompare.district[i])
                // .. return false.
                return false;

        // Compare 'sector' section of the postcode.

        // If character representing 'sector' part of either postcodes is a wildcard ..
        if (this.sector === '?' || postcodeToCompare.sector === '?')
            // .. return true.
            return true;
        // Else if characters representing 'sector' part of the postcode and postcodeToCompare are not equal ..
        else if (this.sector !== postcodeToCompare.sector)
            // .. return false.
            return false;


        // Compare 'unit' section of the postcode.

        // Loop through each character in this postcode 'unit' section.
        for (i in this.unit)
            // If character located under the provided index in either of postcodes 'unit' section is a wildcard ..
            if (this.unit[i] === '?' || postcodeToCompare.unit[i] === '?')
                // .. return true. 
                return true;
            // Else if character located under the provided index in this postcode and postcodeToCompare are not equal ..
            else if (this.unit[i] !== postcodeToCompare.unit[i])
                // .. return false.
                return false;
    }
} module.exports = Postcode;

// Returns index of first encountered digit, or -1 if str does not contain any digits
function getIndexOfFirstDigit(str) {

    // loop through the string, ..
    for (i in str)
        // .. check whether the character is a digit ..
        if (isADigit(str[i]))
            // .. and return it's index if so.
            return i;

    // If no digit has been encountered after looping through entire string, return -1;
    return -1;
}

// Returns index of first encountered wildcard character, or -1 if str does not contain any wildcard characters
function getIndexOfFirstWildcard(str) {

    // loop through the string, ..
    for (i in str) {
        // .. check whether the character is a wildcard ..
        if (str[i] === '?') {
            // .. and return it's index if so.
            return i;
        }
    }

    // If no wildcard has been encountered after looping through entire string, return -1;
    return -1;
}

// Return true if provided string contains a wildcard '?' character. Otherwise returns false.
function includesWildcard(str) {
    return str.includes('?');
}

// Return true if provided string contains a wildcard '?' character located after the specified index. Otherwise returns false.
function includesWildcardAfterIndex(str, i) {
    return str.slice(i + 1).includes('?');
}

// Returns true if provided value represent a digit. Otherwise returns false
function isADigit(value) {
    if (value >= '0' && value <= '9') return true;
    else return false;
}

// Returns true if provided value represent a digit or a wildcard. Otherwise returns false
function isADigitOrWildcard(value) {
    if (value >= '0' && value <= '9') return true;
    else if (value === '?') return true;
    else return false;
}

// Returns true if provided string is a valid format UK postcode. Otherwise returns false.
function isValidPostcode(postcode) {
    var postcodeRegEx = /[A-Z]{1,2}[0-9?]{1,2} ?[0-9?][A-Z?]{2}/i;
    return postcodeRegEx.test(postcode);
}