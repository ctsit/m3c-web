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
            "Publication": bibo + "Document",
            "Publications": bibo + "Document",
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
     * @returns {tpf.Client}
     */
    function NewTPFClient() {
        var endpoint = params.get("endpoint")
        if (!endpoint) {
            endpoint = defaultEndpoint
        }

        /* Replace dashboard links */
        const links = document.getElementsByClassName("dashboard-link")
        for (var i = 0; i < links.length; i++) {
            links[i].href = m3c.DashboardLink()
        }

        const client = new tpf.Client(endpoint)
        client.Endpoint = endpoint
        return client
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

    // Module Exports
    return {
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
