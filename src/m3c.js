"use strict"

if (typeof require !== "undefined") {
    var tpf = require("./tpf.js")
}

/**
 * Functionality specific to M3C's architecture and domain.
 * @module m3c
 */
var m3c = (function module() {

    const loc = window.location

    const params = new URLSearchParams(loc.search)
    const defaultEndpoint = loc.protocol + "//" + loc.hostname + "/tpf/core"

    /**
     * Fetches the total number of individuals of a given type.
     *
     * @param {tpf.Client} client
     * @param {string} type
     * @param {(count: number) => void} callback
     */
    function Count(client, type, callback) {
        const rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
        const totalItems = "<http://www.w3.org/ns/hydra/core#totalItems>"
        const xsdInteger = "^^<http://www.w3.org/2001/XMLSchema#integer>"

        tpf.Query(client.Endpoint, null, rdf + "type", type, 1)
            .then(findTotalItems)
            .then(callback)

        function findTotalItems(triples) {
            for (var i = 0; i < triples.length; i++) {
                const triple = triples[i]

                if (triple.Predicate !== totalItems) {
                    continue
                }

                var cnt = triple.Object
                cnt = cnt.replace(xsdInteger, "")
                cnt = cnt.slice(1, -1)
                cnt = parseInt(cnt)

                return cnt
            }
            return -1
        }
    }

    function DashboardLink() {
        const endpoint = params.get("endpoint")
        if (endpoint) {
            return "index.html?endpoint=" + encodeURIComponent(endpoint)
        }

        return "index.html"
    }

    function IRIFor(concept) {
        const
            base = "http://www.metabolomics.info/ontologies/2019/metabolomics-consortium#",
            bibo = "http://purl.org/ontology/bibo/",
            foaf = "http://xmlns.com/foaf/0.1/"

        const iris = {
            "Dataset": base + "Dataset",
            "Datasets": base + "Dataset",
            "Organization": foaf + "Organization",
            "Organizations": foaf + "Organization",
            "Person": foaf + "Person",
            "People": foaf + "Person",
            "Project": base + "Project",
            "Projects": base + "Project",
            "Publication": bibo + "Article",
            "Publications": bibo + "Article",
            "Study": base + "Study",
            "Studies": base + "Study",
            "Tool": base + "Tool",
            "Tools": base + "Tool",
        }

        return iris[concept]
    }

    /**
     * Generates the canonical, relative form of a Listing page link.
     *
     * Example when used on the staging server *stage.x.org*
     *
     *    ListingLink("people")
     *    => "people.html?endpoint=http://stage.x.org"
     *
     * @param {"people"|"publications"|"projects"|"studies"|"organizations"|"datasets"|"tools"} type
     *        Entity type.
     */
    function ListingLink(type) {
        var url = type + ".html"

        const endpoint = params.get("endpoint")
        if (endpoint) {
            url += "?endpoint=" + encodeURIComponent(endpoint)
        }

        return url
    }

    /**
     * Configures a new TPF Client.
     *
     * By default, if no `endpoint` is passed in the query string, the endpoint
     * of the TPF server is assumed to be at `/tpf/core` on the current server.
     *
     * @param {Node} [loading]
     *
     * @returns {tpf.Client}
     */
    function NewTPFClient(loading) {
        var endpoint = params.get("endpoint")
        if (!endpoint) {
            endpoint = defaultEndpoint
        }

        /* Replace dashboard links */
        const dashboardLinks = document.getElementsByClassName("dashboard-link")
        for (var i = 0; i < dashboardLinks.length; i++) {
            dashboardLinks[i].href = m3c.DashboardLink()
        }

        /* Replace sub-header links */
        const subHeaderLinks = document.getElementsByClassName("sub-header-link");
        for (var i = 0; i < subHeaderLinks.length; i++) {
            subHeaderLinks[i].href = m3c.ListingLink(subHeaderLinks[i].href.split(".")[0])
        }

        /* Listen for nav menu toggle */
        const menuToggle = document.getElementById("menuToggle")
        if (menuToggle) {
            menuToggle.addEventListener("click", toggleMenu)
        }

        const client = new tpf.Client(endpoint)
        client.Endpoint = endpoint
        patchFetch(client, loading)

        return client
    }

    function toggleMenu() {
        const menuToggle = document.getElementById("menuToggle")
        const navs = document.querySelectorAll("header nav, header div")

        if (!menuToggle || !navs) {
            return
        }

        navs.forEach(function(nav) {
            if (nav.className.indexOf("opened") === -1) {
                menuToggle.className = (menuToggle.className + " opened").trim()
                nav.className = (nav.className + " opened").trim()
                return
            }
    
            menuToggle.className = menuToggle.className.replace("opened", "").trim()
            nav.className = nav.className.replace("opened", "").trim()
        })
    }

    /**
     * Generates the full URL for a photo taking into account the endpoint.
     *
     * Example when used on the staging server *stage.x.org*
     *
     *    PhotoURL("http://stage.x.org/tpf/core", "/file/n007/photo.jpg")
     *    => "http://stage.x.org/file/n007/photo.jpg"
     */
    function PhotoURL(endpoint, path) {
        const basehref = endpoint.replace("/tpf/core", "")
        return basehref + path
    }

    /**
     * Generates the canonical, relative form of a Profile page link.
     *
     * Example when used on the staging server *stage.x.org*
     *
     *    ProfileLink("person", "http://x.org/n007")
     *    => "person.html?iri=http://x.org/n007&endpoint=http://stage.x.org"
     *
     * @param {"person"|"publication"|"project"|"study"|"organization"|"dataset"|"tool"} type
     *        Entity type.
     * @param {string} iri  IRI of the entity.
     */
    function ProfileLink(type, iri) {
        if (iri[0] === '<') {
            iri = iri.slice(1,-1)
        }

        var url = type + ".html?iri=" + encodeURIComponent(iri)

        const endpoint = params.get("endpoint")
        if (endpoint) {
            url += "&endpoint=" + encodeURIComponent(endpoint)
        }

        return url
    }

    /**
     * Gets the subject IRI from the `iri` query string parameter.
     * @returns {string}
     */
    function Subject() {
        return params.get("iri")
    }

    /* Monkey patch fetch to easily track when data loading occurs */
    function patchFetch(client, loadingIcon) {
        if (typeof window === "undefined" || !window.fetch || window._fetch) {
            return
        }

        var fetches = 0
        const loading = []
        const done = []

        function decrement() {
            fetches -= 1
            if (fetches === 0) {
                done.forEach(function (callback) {
                    setTimeout(callback, 1)
                })
            }
        }

        function increment() {
            fetches += 1
            if (fetches === 1) {
                loading.forEach(function (callback) {
                    setTimeout(callback, 1)
                })
            }
        }

        const fetch = window.fetch
        window.fetch = function m3cFetch() {
            increment()
            return fetch
                .apply(null, arguments)
                .then(function (response) {
                    decrement()
                    return response
                })
                .catch(function (err) {
                    decrement()
                    throw err
                })
        }

        client.OnLoading = function OnLoading(callback) {
            loading.push(callback)
        }

        client.OnDone = function onDone(callback) {
            done.push(callback)
        }

        // Setup automatic behavior to toggle loading icon.
        if (!loadingIcon) {
            loadingIcon = window.document.querySelector(".fa-spinner.fa-spin")
            if (!loadingIcon) {
                return
            }
        }

        client.OnLoading(function () {
            loadingIcon.className =
                loadingIcon.className.replace("hidden", "").trim()
        })

        client.OnDone(function () {
            loadingIcon.className = loadingIcon.className + " hidden"
        })
    }

    // Module Exports
    return {
        Count: Count,
        DashboardLink: DashboardLink,
        IRIFor: IRIFor,
        ListingLink: ListingLink,
        NewTPFClient: NewTPFClient,
        PhotoURL: PhotoURL,
        ProfileLink: ProfileLink,
        Subject: Subject,
    }

})()

if (typeof module !== "undefined") {
    module.exports = m3c
}
