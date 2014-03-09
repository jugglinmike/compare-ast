var parse = require('esprima').parse;
var Errors = require('./match-error');
var normalizeMemberExpr = require('./util/normalize-member-expr');

// Given a "template" expected AST that defines abstract identifier names
// described by `options.varPattern`, "bind" those identifiers to their
// concrete names in the "actual" AST.
function compareAst(actualSrc, expectedSrc, options) {
	var actualAst, expectedAst;
	options = options || {};

	if (!options.comparators) {
		options.comparators = [];
	}

	/*
	 * A collection of comparator functions that recognize equivalent nodes
	 * that would otherwise be reported as unequal by simple object comparison.
	 * These may:
	 *
	 * - return `true` if the given nodes can be verified as equivalent with no
	 *   further processing
	 * - return an instance of MatchError if the nodes are verified as
	 *   uniquivalent
	 * - return any other value if equivalency cannot be determined
	 */
	Array.prototype.push.apply(options.comparators, [
		require('./comparators/fuzzy-identifiers')(options),
		require('./comparators/fuzzy-strings')(options)
	]);

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

	function _bind(actual, expected) {
		var attr;

		// Literal values
		if (Object(actual) !== actual) {
			if (actual !== expected) {
				throw new Errors.MatchError(actualAst, expectedAst);
			}
			return;
		}

		// Arrays
		if (Array.isArray(actual)) {
			if (actual.length !== expected.length) {
				throw new Errors.MatchError(actualAst, expectedAst);
			}
			actual.forEach(function(_, i) {
				_bind(actual[i], expected[i]);
			});
			return;
		}

		// Nodes

		normalizeMemberExpr(actual);
		normalizeMemberExpr(expected);

		if (checkEquivalency(options.comparators, actual, expected)) {
			return;
		}

		// Either remove attributes or recurse on their values
		for (attr in actual) {
			if (expected && attr in expected) {
				_bind(actual[attr], expected[attr]);
			} else {
				throw new Errors.MatchError(actualAst, expectedAst);
			}
		}
	}

	// Start recursing on the ASTs from the top level.
	_bind(actualAst, expectedAst);

	return null;
}

var checkEquivalency = function(comparators, actual, expected) {
	var result = comparators.map(function(comparator) {
		return comparator(actual, expected);
	}).reduce(function(prev, current) {
		if (current === true) {
			return true;
		}
		return prev || current;
	}, null);

	if (result instanceof Errors) {
		throw result;
	} else if (result === true) {
		return true;
	}
};

compareAst.Error = Errors;

module.exports = compareAst;
