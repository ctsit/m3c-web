const assert = require("assert").strict
const mocha = require("mocha")

// Mock the Window object so the m3c library works
global.window = {
    location: {
    }
}

const m3c = require("../src/m3c.js")

mocha.describe("m3c.ProfileLink", function () {
    mocha.it("Should strip surrounding angle brackets", function () {
        const input = "<http://example.org/i/ertugul>"
        const expected = "test.html?iri=http%3A%2F%2Fexample.org%2Fi%2Fertugul"
        const actual = m3c.ProfileLink("test", input)
        assert.equal(actual, expected)
    })
})
