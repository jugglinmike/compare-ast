var parse = require('esprima').parse;
var Errors = require('./match-error');
var toLiteral = require('./util/identifier-to-literal');

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
			actual.forEach(function(_, i) {
				_bind(actual[i], expected[i]);
			});
			return;
		}

		// Nodes

		if (checkEquivalency(actual, expected, options)) {
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

var checkEquivalency = function(actual, expected, options) {
	var len = comparators.length;
	var comparator, idx, types;

	for (idx = 0; idx < len; ++idx) {
		comparator = comparators[idx];
		types = comparator.types;
		if (!(actual.type === types[0] && expected.type === types[1]) &&
			!(actual.type === types[1] && expected.type === types[0])) {
			continue;
		}
		if (comparator.handler(actual, expected, options)) {
			return true;
		}
	}

	return false;
};

// A collection of comparator functions that recognize equivalent nodes that
// would otherwise be reported as unequal by simple object comparison. These
// may:
//
// - return `true` if the given nodes can be verified as equivalent with no
//   further processing
// - throw an error if the nodes are verified as uniquivalent
// - return any other value if equivalency cannot be determined
var comparators = [
	{
		// Update unbound variable names in the expected AST, using the
		// previously-bound value when available.
		types: ['Identifier', 'Identifier'],
		handler: function(actual, expected, options) {
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
		}
	},
	{
		// Recognize simple string deferencing as equivalent to "dot notation"
		// with a matching identifier (i.e. `a.b;` is equivalent to `a['b'];`).
		types: ['MemberExpression', 'MemberExpression'],
		handler: function(actual, expected, options) {
			var literal, props;

			// When the actual property is an Identifier, compare its literal
			// representation against the expected property.
			if (actual.property.type === 'Identifier') {
				literal = toLiteral(actual.property);
				if (checkEquivalency(literal, expected.property, options)) {
					actual.property = literal;
					return true;
				}
			}

			props = {};

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
	},
	{
		// Fuzzy string matching
		types: ['Literal', 'Literal'],
		handler: function(actual, expected, options) {
			var stringPattern = options.stringPattern;
			var boundStrings;

			if (!options.boundStrings) {
				options.boundStrings = {};
			}
			boundStrings = options.boundStrings;

			if (!stringPattern) {
				return false;
			}

			if (!stringPattern.test(expected.value)) {
				return false;
			}

			var expectedValue = boundStrings[expected.value];
			// This string value has previously been bound
			if (expectedValue) {
				if (expectedValue !== actual.value) {
					throw new Errors.BindingError(actual.value, expected.value);
				}
			} else {
				boundStrings[expected.value] = actual.value;
			}

			expected.value = actual.value;

			return true;
		}
	}
];

compareAst.Error = Errors;

module.exports = compareAst;
