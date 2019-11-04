"use strict"

if (typeof require !== "undefined") {
    // No imports.
}

/**
 * Functionality used to interact with a Triple Pattern Fragment (TPF) server.
 * @module tpf
 */
var tpf = (function module() {

    const rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns#"

    /**
     * Client for a Triple Pattern Fragment server.
     *
     * The main benefit of this client is its caching of previous TPF requests.
     * Additionally, it supports both a fluent API using {@link Client#Entity}
     * and Promise-based querying using {@link Client#Query}.
     *
     * @param {string} endpoint URL of the TPF server.
     * @class
     */
    function Client(endpoint) {
        const self = this
        const cache = {}

        /**
         * Query the TPF server for an entity using a fluent/chaining interface.
         *
         * **Example**: get all emails via vcard
         *
         *    new Client("https://vivo.metabolomics.info/tpf/core")
         *       .Entity("https://vivo.metabolomics.info/individual/n007")
         *       .Link("http://purl.obolibrary.org/obo/", "ARG_2000028")
         *       .Link("http://www.w3.org/2006/vcard/ns#", "hasEmail")
         *       .Link("http://www.w3.org/2006/vcard/ns#", "email")
         *       .Results(function (emails) { console.log(emails) })
         * @param {string} iri
         */
        this.Entity = function Entity(iri) {
            return new fluentQuery(self, [iri])
        }

        this.List = function List(type) {
            return new fluentQuery(self, []).List(type)
        }

        /**
         * Maps subject-IRIs to object-IRIs with a given `predicate`.
         *
         * Unlike {@link Client#MapAll}, this expects a one-to-one mapping
         * between subject and object.
         *
         * **Example**: get a map of person to their one and only VCard
         *
         *    new Client("https://vivo.metabolomics.info/tpf/core")
         *       .Map("http://purl.obolibrary.org/obo/ARG_2000028",
         *            function (map) { // Print James's one and only VCard
         *                var vcard = map["https://vivo.metabolomics.info/individual/n007"]
         *                console.log(vcard)
         *            })
         * @param {string} predicate
         * @param {({[subjectIRI: string]: string})} [callback]
         * @returns {Promise<{[subjectIRI: string]: string}>}
         */

        this.Map = function Map(predicate, callback) {
            return this
                .Query(null, predicate, null)
                .then(function (triples) {
                    const map = {}

                    triples.forEach(function (triple) {
                        map[triple.Subject] = triple.Object
                    })

                    if (callback) {
                        callback(map)
                    }

                    return map
                })
        }

        /**
         * Maps subject-IRIs to a list of object-IRIs with a given `predicate`.
         *
         * Maps are represented as JavaScript objects. The subject-IRIs are the
         * JavaScript object's properties and their values are a list of
         * object-IRIs.
         *
         * **Example**: get a map of Person to their VCards
         *
         *    new Client("https://vivo.metabolomics.info/tpf/core")
         *       .MapAll("http://purl.obolibrary.org/obo/ARG_2000028",
         *            function (map) { // Print James's VCards
         *                var person =
         *                    "https://vivo.metabolomics.info/individual/n007"
         *                console.log(map[person])
         *            })
         * @param {string} predicate
         * @param {({[subjectIRI: string]: string[]})} [callback]
         * @returns {Promise<{[subjectIRI: string]: string[]}>}
         */
        this.MapAll = function MapAll(predicate, callback) {
            return this
                .Query(null, predicate, null)
                .then(function (triples) {
                    const map = {}

                    triples.forEach(function (triple) {
                        if (!map[triple.Subject]) {
                            map[triple.Subject] = []
                        }
                        map[triple.Subject].push(triple.Object)
                    })

                    if (callback) {
                        callback(map)
                    }

                    return map
                })
        }

        /**
         * Query the TPF server.
         *
         * @param {string} subject
         * @param {string} predicate
         * @param {string} object
         * @param {number} page If unspecified or < 1, all pages are returned.
         */
        this.Query = function query(subject, predicate, object, page) {
            if (page) {
                return Query(endpoint, subject, predicate, object, page)
                    .then(function (triples) { return triples.filter(useful) })
            }

            return call([], 1)
                .then(function (triples) { return triples.filter(useful) })

            function call(allTriples, page) {
                return Query(endpoint, subject, predicate, object, page)
                    .then(function (triples) {
                        // http://www.w3.org/ns/hydra/core#nextPage
                        if (!triples.some(hasNextPage)) {
                            return allTriples.concat(triples)
                        }

                        return call(allTriples.concat(triples), page + 1)

                        function hasNextPage(triple) {
                            const np = "<http://www.w3.org/ns/hydra/core#nextPage>"
                            return triple.Predicate === np
                        }
                    })
            }
        }

        /** Queries the TPF server for the entity with `iri`, if not cached. */
        this.lookup = function lookup(iri) {
            if (valid(cache[iri])) {
                return Promise.resolve(cache[iri].triples)
            }

            return self.Query(iri)
                .then(function (triples) {
                    cache[iri] = {
                        triples: triples,
                        updated: new Date(),
                    }
                    return triples
                })
                .then(function (triples) { return triples.filter(useful) })
        }

        /** Returns whether an item is in the cache and is recent or not. */
        function valid(cacheItem) {
            if (!cacheItem) {
                return false
            }

            const cutoff = 30000 // 5 minutes
            const now = new Date()

            return now - cacheItem.updated < cutoff
        }
    }

    /**
     * Creates an IRI Reference string of the form \<http://example.com/x>.
     * @param {string} prefix
     * @param {string} fragment
     * @returns {string}
     */
    function IRIReference(prefix, fragment) {
        return "<" + prefix + fragment + ">"
    }

    /**
     * Parses n-triples into an array of three strings.
     * @param {string} text
     * @returns {{Subject: string, Object: string, Predicate: string}}
     */
    function ParseTriples(text) {
        const triples = []

        const lines = text.split("\n")

        for (let i = 0; i < lines.length; i++) {
            const parts = lines[i].split(" ")
            // parts should be an array of at least 4 elements ending with "."
            // ["<http...>", "<http...>", "\"Hi", "there!\"@en-US"", "."]
            if (parts.length < 4) {
                continue
            }

            const triple = {
                Subject: parts[0],
                Predicate: parts[1],
                Object: parts.slice(2, parts.length - 1).join(" "),
            }

            triples.push(triple)
        }

        return triples
    }

    /**
     * Query a Linked Data Fragments Server by triple pattern.
     * @param {string} endpoint URL of the TPF server.
     * @param {string} subject
     * @param {string} predicate
     * @param {string} object
     * @param {number} page
     * @returns {Promise<{Subject: string, Object: string, Predicate: string}>}
     */
    function Query(endpoint, subject, predicate, object, page) {
        const criteria = {
            subject: subject || "",
            predicate: predicate || "",
            object: object || "",
            page: page || 1,
        }

        const headers = {
            Accept: "application/n-triples; charset=utf-8"
        }

        const options = {
            headers: headers,
        }

        const url = endpoint + encodeQueryString(criteria)

        return fetch(url, options)
            .then(function (data) { return data.text() })
            .then(ParseTriples)
    }

    /** Removes the surrounding double-quotation marks from a string. */
    function decodeString(str) {
        if (str.length === 0) {
            return str
        }


        if (str[0] !== '"') {
            return str
        }

        const suffix = "^^<http://www.w3.org/1999/02/22-rdf-syntax-ns#langString>"
        str = str.replace(suffix, '')
        // Chop of the language tag (example: "Hi"@en-US => Hi)
        str = str.substring(0, str.lastIndexOf('"') + 1)
        return str
    }

    /** Encodes the individual parts of a query string to make it URI safe. */
    function encodeQueryString(parts) {
        if (!parts || Object.keys(parts).length === 0) {
            return ""
        }

        const enc = encodeURIComponent

        return "?" +
            Object
                .keys(parts)
                .map(function (key) {
                    const pair = [enc(key), enc(parts[key])]
                    return pair.join("=")
                })
                .join("&")
    }

    /** Flattens a multi-dimensional array into a single-dimensional array. */
    function flatten(multiDimensionalArray) {
        return multiDimensionalArray
            .reduce(function (prev, current) {
                return prev.concat(current)
            }, [])
    }

    /**
     * Supports the fluent/chaining interface for TPF querying.
     *
     * This works by tracking, but postponing, the lookups until {@link Results}
     * is called. At that point, each entity is looked up, then filtered. The
     * process repeats until there are no more links to follow.
     * @class
     */
    function fluentQuery(client, subjects) {
        const self = this
        this.subjects = subjects
        this.triples = []
        this.functions = []

        /**
         * Executes `callback` on every result of the query.
         * @param {(results: triple[])} callback
         * @returns {fluentQuery}
         */
        this.ForEach = function ForEach(callback) {
            this.Results(function (results) {
                results.forEach(callback)
            })
            return this
        }

        /**
         * Queries for all entities of `type`.
         * @param {string} type
         * @returns {fluentQuery}
         */
        this.List = function List(type) {
            const a = rdf + "type"

            function list() {
                return client
                    .Query(null, a, type)
                    .then(function (instances) {
                        self.subjects =
                            instances.map(function (t) { return t.Subject })
                    })
            }

            this.functions.push(list)

            return this
        }

        /**
         * Follows the link between current subjects and objects with predicate
         * comprised of ontology and fragment.
         *
         * For example, if the current subject is a VCard, you could call
         * `Link(vcard, "hasEmail")` to get all Email Attributes.
         *
         * @param {string} ontology
         * @param {string} fragment
         * @returns {fluentQuery}
         */
        this.Link = function Link(ontology, fragment) {
            this.functions.push(link)
            return this

            function link() {
                return self
                    .lookupSubjects()
                    .then(setSubjects)
            }

            function setSubjects(results) {
                const pred = IRIReference(ontology, fragment)
                self.subjects =
                    flatten(results)
                        .filter(function (t) { return t.Predicate === pred })
                        .map(function (t) { return t.Object })
            }
        }

        /**
         * Executes the query, then calling `callback` with the results.
         * @param {(results: string[])} callback
         * @returns {fluentQuery}
         */
        this.Results = function Results(callback) {
            this.process()
                .then(function () {
                    const decoded = self.subjects.map(decodeString)
                    callback(decoded)
                })

            return this
        }

        /**
         * Executes the query and passes a single result to `callback`.
         * @param {(result: string)} callback
         */
        this.Single = function Single(callback) {
            this.Results(function (multiple) {
                if (multiple.length === 0) {
                    callback("")
                } else {
                    callback(multiple[0])
                }
            })

            return this
        }

        /**
         * Filters the current subjects by
         *
         * @param {string} ontology
         * @param {string} fragment
         * @returns {fluentQuery}
         */
        this.Type = function Type(ontology, fragment) {
            this.functions.push(filter)
            return this

            function filter() {
                return self
                    .lookupSubjects()
                    .then(filterSubjectsWithDesiredType)
            }

            function filterSubjectsWithDesiredType(results) {
                const a = IRIReference(rdf, "type")
                const type = IRIReference(ontology, fragment)

                self.subjects =
                    flatten(results)
                        .filter(function (t) { return t.Predicate === a && t.Object === type })
                        .map(function (t) { return t.Subject })
            }
        }

        /** Helper function to get all triples for all the current subjects. */
        this.lookupSubjects = function lookupSubjects() {
            return Promise.all(self.subjects.map(client.lookup))
        }

        /** Executes each function in order while preserving state changes. */
        this.process = function process() {
            if (this.functions.length === 0) {
                return Promise.resolve(this.results)
            }

            const head = this.functions.shift()

            return head()
                .then(function () { return self.process() })
        }
    }

    /**
     * Removes unused metadata and hypermedia-control triples.
     * @see http://www.hydra-cg.com/spec/latest/triple-pattern-fragments/#definition
     */
    function useful(triple) {
        const controls = "http://www.w3.org/ns/hydra/core"
        const metadata = "http://rdfs.org/ns/void"

        return triple.Object.indexOf(controls) === -1 &&
            triple.Object.indexOf(metadata) === -1 &&
            triple.Predicate.indexOf(controls) === -1 &&
            triple.Predicate.indexOf(metadata) === -1
    }

    // Module Exports
    return {
        Client: Client,
        IRIReference: IRIReference,
        ParseTriples: ParseTriples,
        Query: Query,
    }

})()

if (typeof module !== "undefined") {
    module.exports = tpf
}
