"use strict"

if (typeof require !== "undefined") {
    var tpf = require("./tpf.js")
}

/**
 * Models of the various Entities such as a Person.
 * @module entity
 */
var entity = (function module() {
    const
        base = "http://www.metabolomics.info/ontologies/2019/metabolomics-consortium#",
        bibo = "http://purl.org/ontology/bibo/",
        foaf = "http://xmlns.com/foaf/0.1/",
        rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        obo = "http://purl.obolibrary.org/obo/",
        rdfs = "http://www.w3.org/2000/01/rdf-schema#",
        vcard = "http://www.w3.org/2006/vcard/ns#",
        vitro = "http://vitro.mannlib.cornell.edu/ns/vitro/public#",
        vivo = "http://vivoweb.org/ontology/core#"

    /**
     * Fetches all Authorships, the link between authors and publications.
     * @param {tpf.Client} client
     */
    function Authorships(client) {
        return client
            .Query(null, vivo + "relates", null)
            .then(function (triples) {
                const authorships = {}
                triples.forEach(function (triple) {
                    if (!authorships[triple.Subject]) {
                        authorships[triple.Subject] = []
                    }

                    authorships[triple.Subject].push(triple.Object)
                })
                return authorships
            })
    }

    /**
     * Fetches a mapping from person IRI to their associated organizations' IRI.
     * @param {tpf.Client} client
     */
    function AssociatedWiths(client) {
        return client.MapAll(base + "associatedWith")
    }

    /**
     * Fetches a mapping from publication IRI to their citation
     * @param {tpf.Client} client
     */
    function Citations(client) {
        return client.Map(base + "citation")
    }

    function Departments(client) {
        return new Promise(function (resolve) {
            client
                .List(vivo + "Department")
                .Results(resolve)
        })
    }

    function FundingOrganizations(client) {
        return client.Map(base + "managedBy")
    }

    function Institutes(client) {
        return new Promise(function (resolve) {
            client
                .List(vivo + "Institute")
                .Results(resolve)
        })
    }

    function Laboratories(client) {
        return new Promise(function (resolve) {
            client
                .List(vivo + "Laboratory")
                .Results(resolve)
        })
    }

    function MainImages(client) {
        return client.MapAll(vitro + "mainImage")
    }

    function DownloadLocations(client) {
        return client.MapAll(vitro + "downloadLocation")
    }

    function DirectDownloadUrls(client) {
        return client.MapAll(vitro + "directDownloadUrl")
    }

    /**
     * Fetches the name (label) of an Entity.
     *
     * @param {tpf.Client} client
     * @param {string} iri IRI of an Entity
     * @param {(name: string) => void} returnName
     *        Callback function that receives the name.
     */
    function Name(client, iri, returnName) {
        return new Promise(function() {
            client
                .Entity(iri)
                .Link(rdfs, "label")
                .Single(decodeString(returnName))
        })
    }

    /**
     * Fetches all names.
     * @param {tpf.Client} client
     */
    function Names(client) {
        return client.Query(null, rdfs + "label", null).then(function(triples) {
            const names = {}
            triples.forEach(function(triple) {
                names[triple.Subject] = ParseVIVOString(triple.Object)
            })
            return names
        })
    }

    /**
     *
     * @param {tpf.Client} client
     * @param {string} iri IRI of the Organization
     */
    function Organization(client, iri) {
        return new organization(client, iri)
    }

    /**
     * Gets a mapping from child organization IRI to their parent's IRI.
     * @param {tpf.Client} client
     */
    function Parents(client) {
        return client.Map(base + "hasParent")
    }

    /**
     * Extract the actual text from a VIVO string
     * @param {string} [text]
     * @returns string
     */
    function ParseVIVOString(text) {
        if (!text || text[0] != '"') {
            return text
        }

        text = text.slice(1, text.lastIndexOf('"'))
        text = JSON.parse('"' + text + '"')
        return text
    }

    /**
     *
     * @param {tpf.Client} client
     * @param {string} iri IRI of the Person
     */
    function Person(client, iri) {
        return new person(client, iri)
    }

    /**
     * Fetches all entities of type foaf:Person.
     * @param {tpf.Client} client
     */
    function Persons(client) {
        return new Promise(function(resolve) {
            client.List(foaf + "Person").Results(resolve)
        })
    }

    function Project(client, iri) {
        return new project(client, iri)
    }

    function Projects(client) {
        return new Promise(function(resolve) {
            client.List(base + "Project").Results(resolve)
        })
    }

    function Publication(client, iri) {
        return new publication(client, iri)
    }

    function PublicationDates(client) {
        const dateTimeValues = client.Query(null, vivo + "dateTimeValue", null)
        const dateTimes = client.Query(null, vivo + "dateTime", null)

        return Promise.all([dateTimeValues, dateTimes])
            .then(function (results) {
                const dateTimesToPubs = mapTriples(results[0], true)
                const dateTimesToValues = mapTriples(results[1])

                const dates = {}
                Object.keys(dateTimesToValues).forEach(function (dateTimeIRI) {
                    const publicationIRI = dateTimesToPubs[dateTimeIRI]
                    if (!publicationIRI) {
                        return
                    }
                    const value = dateTimesToValues[dateTimeIRI]
                    if (!value) {
                        return
                    }

                    const date = value.slice(1, value.indexOf('T'))
                    if (date && date.length === "2012-06-23".length) {
                        dates[publicationIRI] = date
                    }
                })

                return dates
            })
    }

    function PublicationYears(client) {
        return PublicationDates(client)
            .then(function (dates) {
                const years = {}
                for (const publicationIRI in dates) {
                    const date = dates[publicationIRI]
                    const year = date.slice(0, "2012".length)
                    if (year && year.length === 4) {
                        years[publicationIRI] = year
                    }
                }
                return years
            })
    }

    function Publications(client) {
        return new Promise(function (resolve) {
            client
                .List(bibo + "Article")
                .Results(resolve)
        })
    }

    function Studies(client) {
        return new Promise(function(resolve) {
            client.List(base + "Study").Results(resolve)
        })
    }

    function Study(client, iri) {
        return new study(client, iri)
    }

    function SubmissionDates(client) {
        return client
            .Query(null, base + "submitted", null)
            .then(function(triples) {
                const submitted = {}
                triples.forEach(function(triple) {
                    submitted[triple.Subject] = parseDate(triple.Object)
                })
                return submitted
            })
    }

    function Tags(client) {
        return client
            .Query(null, base + "tag", null)
            .then(function (triples) {
                const tags = {}
                triples.forEach(function (triple) {
                    if (!tags[triple.Subject]) {
                        tags[triple.Subject] = []
                    }

                    const tag = deleteSurroundingQuotes(triple.Object)
                    tags[triple.Subject].push(tag)
                })
                return tags
            })
    }

    function Tool(client, iri) {
        return new tool(client, iri)
    }

    function ToolApproaches(client){
        return client.MapAll(base + "approach")
    }

    function ToolFunctionalities(client){
        return client.MapAll(base + "functionality")
    }

    function ToolInstrumentalDataTypes(client){
        return client.MapAll(base + "instrumentalDataType")
    }

    function ToolLanguages(client){
        return client.MapAll(base + "programmingLanguage")
    }

    function ToolTypes(client){
        return client.MapAll(base + "softwareType")
    }

    function Tools(client) {
        return new Promise(function(resolve) {
            client.List(base + "Tool").Results(resolve)
        })
    }

    function decodeString(callback) {
        return function decoder(text) {
            callback(deleteSurroundingQuotes(text))
        }
    }

    function decodeStrings(callback) {
        return function decoder(strings) {
            callback(strings.map(deleteSurroundingQuotes))
        }
    }

    function deleteSurroundingQuotes(str) {
        if (str[0] === '"' && str[str.length - 1] === '"') {
            return str.slice(1, -1)
        }
        return str
    }

    /** Creates a new array from a two-dimensional array. */
    function flatten(arr) {
        return arr.reduce(function(acc, val) {
            return acc.concat(val)
        }, [])
    }

    /**
     * Turns an array of triple objects into a mapping from Subject to Object.
     * If `reverse` is set, then the mapping will be from Object to Subject.
     *
     * @param {{Subject: string, Predicate: string, Object: string}[]} triples
     * @param {boolean} [reverse=false]
     * @returns {{[key: string]: string}}
     */
    function mapTriples(triples, reverse) {
        const mapping = {}
        triples.forEach(function (triple) {
            if (!reverse) {
                mapping[triple.Subject] = triple.Object
            } else {
                mapping[triple.Object] = triple.Subject
            }
        })
        return mapping
    }

    /**
     * Parses a Date object from an xsd:dateTime string.
     *
     * Ex: "2015-07-16T00:00:00"^^<http://www.w3.org/2001/XMLSchema#dateTime>
     */
    function parseDate(dt) {
        const dateTime = dt.substring(1, dt.lastIndexOf('"'))
        return new Date(dateTime)
    }

    /**
     * @class
     * @param {tpf.Client} client
     * @param {string} iri IRI of the Person
     */
    function person(client, iri) {
        this.Collaborators = function Collaborators(returnCollaborators) {
            const runners = new Promise(function(resolve) {
                client
                    .Entity(iri)
                    .Link(base, "isPIFor")
                    .Link(base, "collectionFor")
                    .Link(base, "runBy")
                    .Results(decodeStrings(resolve))
            })

            const investigators = new Promise(function(resolve) {
                client
                    .Entity(iri)
                    .Link(base, "runnerOf")
                    .Link(base, "inCollection")
                    .Link(base, "hasPI")
                    .Results(decodeStrings(resolve))
            })

            const developers = new Promise(function(resolve) {
                client
                    .Entity(iri)
                    .Link(base, "developerOf")
                    .Link(base, "developedBy")
                    .Results(decodeStrings(resolve))
            })

            const coauthors = new Promise(function(resolve) {
                client
                    .Entity(iri)
                    .Link(vivo, "relatedBy")
                    .Type(vivo, "Authorship")
                    .Link(vivo, "relates")
                    .Type(bibo, "Document")
                    .Link(vivo, "relatedBy")
                    .Type(vivo, "Authorship")
                    .Link(vivo, "relates")
                    .Type(foaf, "Person")
                    .Results(decodeStrings(resolve))
            })

            return Promise.all([runners, investigators, developers, coauthors])
                .then(flatten)
                .then(unique)
                .then(excludeSelf)
                .then(returnCollaborators)

            function excludeSelf(collaborators) {
                const person = '<' + iri + '>'
                return collaborators.filter(function (collaborator) {
                    return collaborator !== person
                })
            }
        }

        this.Datasets = function Datasets(returnDatasets) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "runnerOf")
                    .Link(base, "developedFrom")
                    .Results(decodeStrings(returnDatasets))
            })
        }

        this.Emails = function Emails(returnEmails) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(obo, "ARG_2000028")
                    .Link(vcard, "hasEmail")
                    .Link(vcard, "email")
                    .Results(decodeStrings(returnEmails))
            })
        }

        this.Name = function name(returnName) {
            return Name(client, iri, returnName)
        }

        this.Organizations = function Organizations(returnOrganizations) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "associatedWith")
                    .Results(decodeString(returnOrganizations))
            })
        }

        this.Overview = function Overview(returnOverview) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(vivo, "overview")
                    .Single(decodeString(returnOverview))
            })

        }

        this.Phones = function Phones(returnPhones) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(obo, "ARG_2000028")
                    .Link(vcard, "hasTelephone")
                    .Link(vcard, "telephone")
                    .Results(decodeStrings(returnPhones))
            })
        }

        this.Photo = function Photo(returnPhoto) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(vitro, "mainImage")
                    .Link(vitro, "downloadLocation")
                    .Link(vitro, "directDownloadUrl")
                    .Single(decodeString(returnPhoto))
            })
        }

        this.PhotoThumbnail = function Photo(returnPhoto) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(vitro, "mainImage")
                    .Link(vitro, "downloadLocation")
                    .Link(vitro, "directDownloadUrl")
                    .Single(decodeString(returnPhoto))
            })
        }

        this.Projects = function Projects(returnProjects) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "isPIFor")
                    .Results(decodeStrings(returnProjects))
            })
        }

        this.Publications = function Publications(returnPublications) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(vivo, "relatedBy")
                    .Type(vivo, "Authorship")
                    .Link(vivo, "relates")
                    .Type(bibo, "Document")
                    .Results(decodeStrings(returnPublications))
            })
        }

        this.Studies = function Studies(returnStudies) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "runnerOf")
                    .Results(decodeStrings(returnStudies))
            })
        }

        this.Tools = function Tools(returnTools) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "developerOf")
                    .Results(decodeStrings(returnTools))
            })
        }
    }

    /**
     * @class
     * @param {tpf.Client} client
     * @param {string} iri IRI of the Organization
     */
    function organization(client, iri) {
        this.Children = function Children(returnChildren) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "parentOf")
                    .Results(decodeStrings(returnChildren))
            })
        }

        this.Grandparent = function Grandparent(returnGrandparent) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "hasParent")
                    .Link(base, "hasParent")
                    .Single(decodeString(returnGrandparent))
            })
        }

        this.Name = function name(returnName) {
            return Name(client, iri, returnName)
        }

        this.Parent = function Parent(returnParent) {
            return new Promise(function (resolve) {
                client
                    .Entity(iri)
                    .Link(base, "hasParent")
                    .Single(decodeString(function (data) {
                        returnParent(data)
                        resolve(data)
                    }))
            })
        }

        this.People = function People(returnPeople) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "associationFor")
                    .Results(decodeStrings(returnPeople))
            })
        }

        this.Projects = function Projects(returnProjects) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "manages")
                    .Results(decodeStrings(returnProjects))
            })
        }

        this.Publications = function Publications(returnPublications) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "associationFor")
                    .Link(vivo, "relatedBy")
                    .Type(vivo, "Authorship")
                    .Link(vivo, "relates")
                    .Type(bibo, "Document")
                    .Results(decodeStrings(returnPublications))
            })
        }

        this.Studies = function Studies(returnStudies) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "directs")
                    .Results(decodeStrings(returnStudies))
            })
        }

        const typeNames = {
            "<http://vivoweb.org/ontology/core#Institute>": "Institute",
            "<http://vivoweb.org/ontology/core#Department>": "Department",
            "<http://vivoweb.org/ontology/core#Laboratory>": "Laboratory"
        }

        this.Type = function Type(returnType) {
            const getTypes = new Promise(function (resolve) {
                client
                    .Entity(iri)
                    .Link(rdf, "type")
                    .Results(decodeStrings(resolve))
            })

            return getTypes
                .then(getMostSpecificType)

            function getMostSpecificType(types) {
                for (var i = 0; i < types.length; i++) {
                    const type = types[i]
                    if (typeNames[type]) {
                        returnType(typeNames[type])
                        return
                    }
                }
                returnType("Organization")
            }
        }
    }

    function project(client, iri) {
        const self = this

        this.Datasets = function Datasets(returnDatasets) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "collectionFor")
                    .Link(base, "developedFrom")
                    .Results(decodeStrings(returnDatasets))
            })
        }

        this.Department = function Department(returnDepartment) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "managedBy")
                    .Type(vivo, "Department")
                    .Single(returnDepartment)
            })
        }

        this.ID = function ID(returnID) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "projectId")
                    .Single(decodeString(returnID))
            })
        }

        this.Institute = function Institute(returnInstitute) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "managedBy")
                    .Type(vivo, "Institute")
                    .Single(returnInstitute)
            })
        }

        this.Laboratory = function Laboratory(returnLaboratory) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "managedBy")
                    .Type(vivo, "Laboratory")
                    .Single(returnLaboratory)
            })
        }

        this.Name = function name(returnName) {
            return Name(client, iri, returnName)
        }

        this.People = function People(returnPeople) {
            const runners = new Promise(function(resolve) {
                client
                    .Entity(iri)
                    .Link(base, "hasPI")
                    .Results(decodeStrings(resolve))
            })

            const investigators = new Promise(function(resolve) {
                client
                    .Entity(iri)
                    .Link(base, "collectionFor")
                    .Link(base, "runBy")
                    .Results(decodeStrings(resolve))
            })

            return Promise.all([investigators, runners])
                .then(flatten)
                .then(unique)
                .then(returnPeople)
        }

        this.Publications = function Publications(returnPublications) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(vivo, "relatedBy")
                    .Type(vivo, "Authorship")
                    .Link(vivo, "relates")
                    .Type(bibo, "Document")
                    .Results(decodeStrings(returnPublications))
            })
        }

        this.Studies = function Studies(returnStudies) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "collectionFor")
                    .Results(decodeStrings(returnStudies))
            })
        }

        this.Summary = function Summary(returnSummary) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "summary")
                    .Single(decodeString(returnSummary))
            })
        }

        this.Tools = function Tools(returnTools) {
            return new Promise(function(resolve) {
                self.People(resolve)
            }).then(function(people) {
                const getToolsByPerson = people.map(function(personIRI) {
                    return new Promise(function(resolve) {
                        client
                            .Entity(personIRI.slice(1, -1))
                            .Link(base, "developerOf")
                            .Results(decodeStrings(resolve))
                    })
                })

                return Promise.all(getToolsByPerson)
                    .then(flatten)
                    .then(unique)
                    .then(returnTools)
            })
        }
    }

    function publication(client, iri) {
        const self = this

        this.Citation = function Citation(returnCitation) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "citation")
                    .Single(decodeString(returnCitation))
            })
        }

        this.PubMedLink = function PubMedLink(returnPubMedLink) {
            const urlbase = "https://www.ncbi.nlm.nih.gov/pubmed/"

            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(bibo, "pmid")
                    .Single(decodeString(makeLink))
            })

            function makeLink(pmid) {
                if (pmid) {
                    returnPubMedLink(urlbase + pmid)
                    return
                }

                self.Title(makeSearchLink)
            }

            function makeSearchLink(title) {
                returnPubMedLink(urlbase + "?term=" + encodeURIComponent(title))
            }
        }

        this.Title = function Title(returnName) {
            return Name(client, iri, returnName)
        }

        this.Year = function Year(returnYear) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(vivo, "dateTimeValue")
                    .Link(vivo, "dateTime")
                    .Single(extractYear)
            })

            function extractYear(dateTime) {
                if (!dateTime || dateTime[0] != '"') {
                    return
                }

                if (dateTime.length != '"1984-01-01T00:00:00"'.length) {
                    return
                }

                const year = dateTime.slice(1, 1 + "1984".length)
                if (!parseInt(year)) {
                    return
                }

                returnYear(year)
            }
        }
    }

    function study(client, iri) {
        self = this

        this.Datasets = function Datasets(returnDatasets) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "developedFrom")
                    .Results(decodeStrings(returnDatasets))
            })
        }

        this.Department = function Department(returnDepartment) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "directedBy")
                    .Type(vivo, "Department")
                    .Single(returnDepartment)
            })
        }

        this.ID = function ID(returnID) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "studyId")
                    .Single(decodeString(returnID))
            })
        }

        this.Institute = function Institute(returnInstitute) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "directedBy")
                    .Type(vivo, "Institute")
                    .Single(returnInstitute)
            })
        }

        this.Laboratory = function Laboratory(returnLaboratory) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "directedBy")
                    .Type(vivo, "Laboratory")
                    .Single(returnLaboratory)
            })
        }

        this.Name = function name(returnName) {
            return Name(client, iri, returnName)
        }

        this.People = function People(returnPeople) {
            const runners = new Promise(function(resolve) {
                client
                    .Entity(iri)
                    .Link(base, "runBy")
                    .Results(decodeStrings(resolve))
            })

            const investigators = new Promise(function(resolve) {
                client
                    .Entity(iri)
                    .Link(base, "inCollection")
                    .Link(base, "isPIFor")
                    .Results(decodeStrings(resolve))
            })

            return Promise.all([investigators, runners])
                .then(flatten)
                .then(unique)
                .then(returnPeople)
        }

        this.Project = function Project(returnProject) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "inCollection")
                    .Single(decodeString(returnProject))
            })
        }

        this.Studies = function Studies(returnStudies) {
            return new Promise(function(resolve) {
                client
                    .Entity(iri)
                    .Link(base, "inCollection")
                    .Link(base, "collectionFor")
                    .Results(decodeStrings(resolve))
            })
                .then(filterOutSelf)
                .then(returnStudies)

            function filterOutSelf(studies) {
                return studies.filter(function(study) {
                    return iri !== study.slice(1, -1)
                })
            }
        }

        this.Submitted = function Submitted(returnSubmitted) {
            return new Promise(function() {
                return client
                    .Query(iri, base + "submitted", null)
                    .then(function(triples) {
                        if (triples.length === 0) {
                            return
                        }

                        const date = parseDate(triples[0].Object)
                        returnSubmitted(date)
                    })
            })
        }

        this.Summary = function Summary(returnSummary) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "summary")
                    .Single(decodeString(returnSummary))
            })
        }
    }

    function tool(client, iri) {
        this.License = function License(returnLicense) {
            const name = new Promise(function (resolve) {
                client
                    .Entity(iri)
                    .Link(base, "licenseType")
                    .Single(decodeString(resolve))
            })

            const url = new Promise(function (resolve) {
                client
                    .Entity(iri)
                    .Link(base, "licenseUrl")
                    .Single(decodeString(resolve))
            })

            return Promise.all([name, url])
                .then(function (results) {
                    const license = {
                        name: results[0],
                        url: results[1],
                    }
                    returnLicense(license)
                    return license
                })
        }

        this.Name = function name(returnName) {
            return Name(client, iri, returnName)
        }

        this.People = function People(returnPeople) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "developedBy")
                    .Results(decodeStrings(returnPeople))
            })
        }

        this.Summary = function Summary(returnSummary) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "summary")
                    .Single(decodeString(returnSummary))
            })
        }

        this.Tags = function Tags(returnTags) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "tag")
                    .Results(decodeStrings(returnTags))
            })
        }

        this.Functionalities = function Functionalities(returnFunctionalities) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "functionality")
                    .Results(decodeStrings(returnFunctionalities))
            })
        }

        this.InstrumentalDataTypes = function InstrumentalDataTypes(returnInstrumentals) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "instrumentalDataType")
                    .Results(decodeStrings(returnInstrumentals))
            })
        }

        this.Approaches = function Approaches(returnApproaches) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "approach")
                    .Results(decodeStrings(returnApproaches))
            })
        }

        this.ProgrammingLanguages = function ProgrammingLanguages(returnLanguages) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "programmingLanguage")
                    .Results(decodeStrings(returnLanguages))
            })
        }

        this.SoftwareTypes = function SoftwareTypes(returnTypes) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "softwareType")
                    .Results(decodeStrings(returnTypes))
            })
        }

        this.Website = function Website(returnWebsite) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "homepage")
                    .Single(decodeString(returnWebsite))
            })
        }
    }

    /**
     * Returns the unique items in an array.
     * @param {(String[]|Number[])} items
     */
    function unique(items) {
        const distinct = {}
        for (var i = 0; i < items.length; i++) {
            const item = items[i]
            distinct[item] = true
        }
        return Object.keys(distinct)
    }

    // Module Exports
    return {
        AssociatedWiths: AssociatedWiths,
        Authorships: Authorships,
        Citations: Citations,
        Departments: Departments,
        DirectDownloadUrls: DirectDownloadUrls,
        DownloadLocations: DownloadLocations,
        FundingOrganizations: FundingOrganizations,
        Institutes: Institutes,
        Laboratories: Laboratories,
        MainImages: MainImages,
        Name: Name,
        Names: Names,
        Organization: Organization,
        Parents: Parents,
        ParseVIVOString: ParseVIVOString,
        Person: Person,
        Persons: Persons,
        Project: Project,
        Projects: Projects,
        Publication: Publication,
        PublicationDates: PublicationDates,
        PublicationYears: PublicationYears,
        Publications: Publications,
        Studies: Studies,
        Study: Study,
        SubmissionDates: SubmissionDates,
        Tags: Tags,
        Tool: Tool,
        ToolApproaches: ToolApproaches,
        ToolFunctionalities: ToolFunctionalities,
        ToolInstrumentalDataTypes: ToolInstrumentalDataTypes,
        ToolLanguages: ToolLanguages,
        ToolTypes: ToolTypes,
        Tools: Tools,
    }
})()

if (typeof module !== "undefined") {
    module.exports = entity
}
