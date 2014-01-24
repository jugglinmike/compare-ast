var parse = require('esprima').parse;
var Errors = require('./match-error');

// Given a "template" expected AST that defines abstract identifier names
// described by `options.varPattern`, "bind" those identifiers to their
// concrete names in the "actual" AST.
function compareAst(actualSrc, expectedSrc, options) {
	var actualAst, expectedAst, varPattern;
	// Lookup table of bound variable names
	var boundVars = {};

	options = options || {};

	try {
		actualAst = parse(actualSrc).body;
	} catch(err) {
		throw new Errors.ParseError();
	}

	try {
		expectedAst = parse(expectedSrc).body;
	} catch (err) {
		throw new Errors.ParseError();
	}

	varPattern = options.varPattern;

	function _bind(actual, expected) {
		var attr, unboundName;

		// Literal values
		if (Object(actual) !== actual) {
			if (actual !== expected) {
				throw new Errors.MatchError(actualAst, expectedAst);
			}
			return;
		}

		// Arrays
		if (Array.isArray(actual)) {
			actual.forEach(function(_, i) {
				_bind(actual[i], expected[i]);
			});
			return;
		}

		// Objects

		// Update unbound variable names in the expected AST, using the
		// previously-bound value when available.
		if (varPattern && actual.type === 'Identifier') {
			if (varPattern.test(expected.name)) {
				unboundName = expected.name;
				if (!(unboundName in boundVars)) {
					boundVars[unboundName] = actual.name;
				}
				expected.name = boundVars[unboundName];

				// This inequality would be caught by the next recursion, but it is
				// asserted here to provide a more specific error--the ASTs do not
				// match because a variable was re-bound.
				if (expected.name !== actual.name) {
					throw new Errors.BindingError(actual.name, expected.name);
				}
			}
		}

		// Either remove attributes or recurse on their values
		for (attr in actual) {
			if (expected && attr in expected) {
				_bind(actual[attr], expected[attr]);
			}
		}
	}

	// Start recursing on the ASTs from the top level.
	_bind(actualAst, expectedAst);

	return null;
}

compareAst.Error = Errors;

module.exports = compareAst;
