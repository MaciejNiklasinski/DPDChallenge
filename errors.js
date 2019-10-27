class ArgumentError extends Error {
    constructor(message, value) {
        super(message);
        this.name = "ArgumentError";
        this.value = value;
    }
  } module.exports.ArgumentError = ArgumentError;
  
  class HTTPError extends Error {
    constructor(message, statusCode, url, options) {
        super(message);
        this.name = "HTTPError";
        this.statusCode = statusCode;
        this.url = url;
        this.options = options;
    }
  } module.exports.HTTPError = HTTPError;