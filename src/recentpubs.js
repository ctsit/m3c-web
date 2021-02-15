// Most Recent Publications
const tpf = require("./tpf")
const entity = require("./entity")

async function main() {
    const endpoint = process.env.TPF_ENDPOINT || "https://people.metabolomics.info/tpf/core"
    const client = new tpf.Client(endpoint)

    const publicationIRIs = await entity.Publications(client)
    const names = await entity.Names(client)
    const authorships = await entity.Authorships(client)
    const published = await entity.PublicationDates(client)
    const citations = await entity.Citations(client)

    // Build the authors mapping: author IRI => list of pubs.
    const authors = {}

    // authorships: IRI => list of unordered, pair (pub, person)
    for (const authorshipIRI in authorships) {
        const relates = authorships[authorshipIRI]

        // Unfortunately, the pub-person pair could be in either
        // order. If the IRI contains "pmid", it's for the Pub.
        var publicationIRI = relates[0]
        var personIRI = relates[1]
        if (relates[0].indexOf("pmid") === -1) {
            personIRI = relates[0]
            publicationIRI = relates[1]
        }

        if (!authors[publicationIRI]) {
            authors[publicationIRI] = []
        }

        authors[publicationIRI].push(personIRI)
    }

    const publications = []
    // arrays have a sort method (publicationIRIs.sort() and then pass a comparison function (use mozilla))
    publicationIRIs.sort(function (a, b) {
        const adate = published[a]
        const bdate = published[b]
        if (adate < bdate) {
            return -1
        }
        if (adate > bdate) {
            return +1
        }
        return 0
    }).reverse()

    for (const pubIRI of publicationIRIs.slice(0, 5)) {
        const authornames = authors[pubIRI]
            .map(function (authorIRI) {
                return names[authorIRI]
            })
        const publication = {
            "iri": pubIRI,
            "pmid": pubIRI.slice(47,-1),
            "title": names[pubIRI],
            "authors": authornames,
            "published": published[pubIRI],
            "citation": entity.ParseVIVOString(citations[pubIRI]),
        }
        publications.push(publication)
    }
    console.log(JSON.stringify(publications))
}

main()
