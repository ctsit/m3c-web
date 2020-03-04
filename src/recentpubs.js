// Most Recent Publications
const tpf = require("./tpf")
const entity = require("./entity")
async function main() {
    const client = new tpf.Client("https://vivo.metabolomics.info/tpf/core")
    const publicationIRIs = await entity.Publications(client)
    const names = await entity.Names(client)
    const authorships = await entity.Authorships(client)
    const years = await entity.PublicationYears(client)

    // const names = await entity.Authorships(client)

    // Build the authors mapping: author IRI => list of pubs.
    const authors = {}

    // authorships: IRI => list of unordered, pair (pub, person)
    const authorshipIRIs = Object.keys(authorships)
    for (var i = 0; i < authorshipIRIs.length; i++) {
        const authorshipIRI = authorshipIRIs[i]
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

    

    // TODO: get publication dates and sort by them
    const publications = []
    // arrays have a sort method (publicationIRIs.sort() and then pass a comparison function (use mozilla))
    publicationIRIs.sort(function (a, b) {
        const adate = years[a]
        const bdate = years[b]
        if (adate < bdate) {
            return -1
        }
        if (adate > bdate) {
            return +1
        }
        return 0
    }).reverse()
    for (const pubIRI of publicationIRIs.slice(0, 10)) {
        var authornames = authors[pubIRI]
            .map(function (authorIRI) {
                return names[authorIRI]
            })
        const publication = {
            "iri": pubIRI,
            "pmid": pubIRI.slice(47,-1),
            "title": names[pubIRI],
            "authors": authornames,
            "published": years[pubIRI]
        }
        publications.push(publication)
    }
    console.log(JSON.stringify(publications))
}

main()