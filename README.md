Metabolomics Consortium Coordinating Center (M3C) Web Frontend
==============================================================

Web frontend for the M3C People Portal: https://people.metabolomics.info


Quickstart
----------

Open the `index.html` file. Set the `endpoint` URL parameter to your TPF
endpoint:

    https://people.metabolomics.info/index.html?endpoint=http://devbox:8888/tpf/core


Contributing
------------

_If you don't already have a code editor, we recommend [Visual Studio Code][].
We use [JSDoc][] for documenting the code, which allows for nice features that
aid in development such as autocompletion._

[JSDoc]: https://jsdoc.app/
[Visual Studio Code]: https://code.visualstudio.com/

### Design Overview

One of the main goals of the M3C is to cultivate a Metabolomics community. To
that end, the design of the frontend is meant to encourage novice programmers
to contribute. Any code should support a wide-range of browsers
(including, Internet Explorer 9) and minimize external dependencies.

The main concepts are:

 + Person;
 + Organization;
 + Publication;
 + Project;
 + Study;
 + Dataset;
 + Tools.

These concepts are modeled in `entity.js`. _Modeled_, in this case, means that
the attributes of each concept have been encapsulated as member functions of an
object. This allows an ontologist (domain expert) to deal with identifying the
correct links for, say, a Person's name (`foaf:Person -> rdfs:label`) while the
page designer need only know the function name (`Person.Name()`).

There are three types of pages:

 + *Profile*, which displays information about a single entity (like a "person");
 + *Listing*, which displays a listing of a type of entity (like "people");
 + *Dashboard*, which displays information about the entire dataset.

Each page consists of its structure (HTML), style (CSS), and code (JavaScript).
There are also some common files shared amongst the pages.

For example, a Person's profile is in `person.html`. The listing for all Persons
is in `people.html`.


### Triple Pattern Fragment (TPF) Client

The backend for the People Portal is one that uses [VIVO][] for data storage.
One of the novel ideas for the web frontend is to use only the TPF server to
fetch data.

The TPF Client is implemented in [`src/tpf.js`](src/tpf.js). It features a
[fluent interface][] and caching to eliminate unnecessary calls to the server.

[fluent interface]: https://en.wikipedia.org/wiki/Fluent_interface
[VIVO]: https://duraspace.org/vivo/


Testing
-------

Testing requires [NodeJS](https://nodejs.org) and the
[MochaJS](https://mochajs.org/) testing framework.

On the command line, run the following commands:

    $ npm install
    $ npm test

Note: while the code under `src/` needs to support older browsers, the code
under `tests/` has no such requirement. So, feel free to use all the arrow
functions and object destructuring that newer versions of JavaScript have.


Conventions
-----------

JavaScript is a multi-paradigm language. As a result, there are many different
idioms, patterns, and styles. In an effort to ease development and provide
consistency, here are the conventions used.

 * Related code should be grouped and separated into their own `.js` file,
   called **modules**.
 * Modules must have the following parts:
   * `"use strict"` declaration;
   * NodeJS-compatible imports section;
   * namespace declaration (where the functions and objects are defined);
   * NodeJS-compatible exports section;
 * Exported (public) names should begin with a capital letter.
 * Unexported (private) names should not be capitalized.

As for formatting, use Visual Studio Code's builtin formatter. Also,

 * No semi-colons.
 * Use double-quotes `"` for strings, not single `'`'.
   * Exception: the string contains a `"` or is a single character.
