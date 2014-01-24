var parse = require('esprima').parse;
var Errors = require('./match-error');

// Given a "template" expected AST that defines abstract identifier names
// described by `options.varPattern`, "bind" those identifiers to their
// concrete names in the "actual" AST.
function compareAst(actualSrc, expectedSrc, options) {
	var actualAst, expectedAst;

	options = options || {};
	// Lookup table of bound variable names
	options.boundVars = {};

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
		var attr, comparator, areEquivalent;

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

		// Nodes

		comparator = comparators[actual.type];
		if (comparator) {
			areEquivalent = comparator(actual, expected, options);
			if (areEquivalent) {
				return;
			}
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

// A collection of comparator functions that recognize equivalent nodes that
// would otherwise be reported as unequal by simple object comparison. These
// may:
//
// - return `true` if the given nodes can be verified as equivalent with no
//   further processing
// - throw an error if the nodes are verified as uniquivalent
// - return any other value if equivalency cannot be determined
var comparators = {
	// Update unbound variable names in the expected AST, using the
	// previously-bound value when available.
	Identifier: function(actual, expected, options) {
		var varPattern = options.varPattern;
		var boundVars = options.boundVars;
		var unboundName;

		if (!varPattern) {
			return;
		}
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
			} else {
				return true;
			}
		}
	},
	// Recognize simple string deferencing as equivalent to "dot notation" with
	// a matching identifier (i.e. `a.b;` is equivalent to `a['b'];`).
	MemberExpression: function(actual, expected) {
		var props = {};

		if (actual.property.type === 'Literal') {
			props.Literal = actual.property.value;
		} else if (actual.property.type === 'Identifier') {
			props.Identifier = actual.property.name;
		}

		if (expected.property.type === 'Literal') {
			props.Literal = expected.property.value;
		} else if (expected.property.type === 'Identifier') {
			props.Identifier = expected.property.name;
		}

		return 'Identifier' in props && 'Literal' in props &&
			props.Identifier === props.Literal;
	}
};

compareAst.Error = Errors;

module.exports = compareAst;
