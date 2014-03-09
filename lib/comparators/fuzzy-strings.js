var Errors = require('../match-error');

var noop = function() {};

module.exports = function(options) {
	var stringPattern = options.stringPattern;

	if (!stringPattern) {
		return noop;
	}

	return function(actual, expected) {
		var boundStrings;

		if (actual.type !== 'Literal' || expected.type !== 'Literal') {
			return;
		}

		if (!options.boundStrings) {
			options.boundStrings = {};
		}
		boundStrings = options.boundStrings;

		if (!stringPattern.test(expected.value)) {
			return false;
		}

		var expectedValue = boundStrings[expected.value];
		// This string value has previously been bound
		if (expectedValue) {
			if (expectedValue !== actual.value) {
				return new Errors.BindingError(actual.value, expected.value);
			}
		} else {
			boundStrings[expected.value] = actual.value;
		}

		expected.value = actual.value;

		return true;
	};
};
