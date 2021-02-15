"""
Site Map generator for the M3C People Portal

This script crawls https://people.metabolomics.info and parses the latest
N-Triples file at `/data/m3c.nt` to convert individual's IRIs to their
corresponding URLs.

The XML for the Site Map is written to standard output; to run, execute:

    $ python3 sitemapper.py >sitemap.xml

Author: Taeber Rapczak <taeber@ufl.edu>
Copyright 2020 University of Florida

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""


from typing import Iterable

import re
import sys
from urllib import parse
from urllib import request
from xml.dom import minidom
import xml.etree.ElementTree as ET


REGEX_LINK = re.compile(rb'<a [^>]*href="([^"][^"]*)"')
TYPE_TO_PAGE = {
    # "<http://purl.org/ontology/bibo/Article>": "publication",
    "<http://www.metabolomics.info/ontologies/2019/metabolomics-consortium#Project>": "project",
    "<http://www.metabolomics.info/ontologies/2019/metabolomics-consortium#Study>": "study",
    "<http://www.metabolomics.info/ontologies/2019/metabolomics-consortium#Tool>": "tool",
    "<http://xmlns.com/foaf/0.1/Organization>": "organization",
    "<http://xmlns.com/foaf/0.1/Person>": "person",
}


class UrlSet:
    def __init__(self) -> None:
        self.element = ET.Element(
            "urlset",
            {"xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        )
        self.urls = set()

    def __str__(self) -> str:
        xml = ET.tostring(self.element, encoding="unicode")
        return minidom.parseString(xml).toprettyxml()

    def add(self, url: str) -> None:
        url = parse.urlunparse(parse.urlparse(url))
        if url in self.urls:
            return
        self.urls.add(url)
        element = ET.SubElement(self.element, "url")
        loc = ET.SubElement(element, "loc")
        loc.text = url


def crawl(baseurl: str) -> Iterable[str]:
    seen = set()
    links = [baseurl]
    while links:
        url = links.pop(0)
        yield url
        for found in findpages(url):
            if found not in seen:
                seen.add(found)
                links.append(f"{baseurl}{found}")


def findpages(url: str) -> Iterable[str]:
    with request.urlopen(url) as resp:
        html = resp.read()
        for match in REGEX_LINK.finditer(html):
            href = match[1].decode("utf-8")
            if href[0] == '#':
                continue
            if href.startswith("http") or ".html" not in href:
                continue
            yield match[1].decode("utf-8")


def main():
    SITE = "https://people.metabolomics.info/"
    NTPATH = "data/m3c.nt"

    urlset = UrlSet()
    for url in crawl(SITE):
        print(url, file=sys.stderr)
        urlset.add(url)

    print("Processing N-Triples file...", file=sys.stderr)
    for url in ntriples(SITE, NTPATH):
        print(url, file=sys.stderr)
        urlset.add(url)

    print(urlset)


def ntriples(baseurl: str, path: str) -> Iterable[str]:
    TYPE = "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>"
    M3C_PREFIX = "<https://vivo.metabolomics.info/individual"
    seen = set()
    with request.urlopen(f"{baseurl}{path}") as resp:
        ntriples = resp.read().decode("utf-8")
        split = ntriples.split('\n')
        for trips in split:
            try:
                s, p, o, _ = trips.split(' ')
                assert s.startswith(M3C_PREFIX)
                assert p == TYPE
                iri = s.replace("<", "").replace(">", "")
                assert iri not in seen
                page = TYPE_TO_PAGE[o]
                seen.add(iri)
                url = f"{baseurl}{page}.html?iri={iri}"
                yield url
            except (AssertionError, KeyError, ValueError):
                continue


if __name__ == "__main__":
    main()
