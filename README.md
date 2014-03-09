# compareAst

Determine if two strings of JavaScript have equivalent abstract syntax trees.
This can be useful to test tools that perform source code transformations.

[![Build
Status](https://travis-ci.org/jugglinmike/compare-ast.png)](https://travis-ci.org/jugglinmike/compare-ast)

## API

This module exports a function with the following signature:

    compareAst(expectedJsSource, actualJsSource [, options])

## Examples

    // Identical sources will not trigger an error:
    compareAst("var a = 3; a++;", "  var a =3; a++;");

    // Because whitespace is insignificant in JavaScript, two sources which
    // only differ in their spacing will not trigger an error:
    compareAst("var a = 3; a++;", "  var a \t=3;\na++;");

    // Code that differs structurally will throw an error
    compareAst("var a = 3; a++;", "var a = 3; a--;");

    // Allow for "fuzzy" variable names by specifying the `varPattern` option
    // as a regular expression:
    compareAst(
      "var a = 3, b = 2; a += b;",
      "var __x1__ = 3, __x2__ = 2; __x1__ += __x2__;",
      { varPattern: /__x\d+__/ }
    );

    // Allow for "fuzzy" string values by specifying the `stringPattern` option
    // as a regular expression:
    compareAst(
      "var a = 'one', b = 'two', c = 'three';"
      "var a = '__s1__', b = '__s2__', c = '__s3__';",
      { stringPattern: /__s\d+__/ }
    );

## Tests

Run via:

    $ npm test

## License

Copyright (c) 2014 Mike Pennisi  
Licensed under the MIT license.
