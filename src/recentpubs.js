// Most Recent Publications
const tpf = require("./src/tpf")
const entity = require("./src/entity")
async function main() {
    const client = new tpf.Client("https://vivo.metabolomics.info/tpf/core")
    const publicationIRIs = await entity.Publications(client)
    const names = await entity.Names(client)
    // const names = await entity.Authorships(client)
    // TODO: get publication dates and sort by them
    const publications = []
    for (const publicationIRI of publicationIRIs.slice(0, 10)) {
        const publication = {
            "iri": publicationIRI,
            "pmid": "304850303",
            "title": names[publicationIRI],
            "authors": [
                "Guoxiang Xie"
            ],
            "published": "2020-01-01T00:00:00"
        }
        publications.push(publication)
    }
    console.log(JSON.stringify(publications))
}
main()