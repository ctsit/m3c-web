"use strict"

if (typeof require !== "undefined") {
    // No imports.
}

/**
 * String utility functions.
 * @module str
 */
var str = (function module() {

    /**
     * Reports whether `substr` is within `text`.
     *
     * @param {string} text   text to search
     * @param {string} substr string to search for within text
     * @returns {boolean}
     */
    function Contains(text, substr) {
        return text.indexOf(substr) !== -1
    }

    /**
     * Replaces instances of `{}` in text with the remaining arguments.
     *
     * Example
     *
     *     str.Format("{}, {}!", "Hello", "World") --> "Hello, World!"
     *
     * @param {string} text
     * @param {...string} _args
     * @returns {string}
     */
    function Format(text, _args) {
        for (let i = 1; i < arguments.length; i++) {
            text = text.replace("{}", arguments[i])
        }

        return text
    }

    // Module exports
    return {
        Contains: Contains,
        Format: Format,
    }

})()

if (typeof module !== "undefined") {
    module.exports = str
}
