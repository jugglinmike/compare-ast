function CompareAstError(actual, expected) {
	this.actual = actual;
	this.expected = expected;
}

var ParseError = CompareAstError.ParseError = function() {
	CompareAstError.apply(this, arguments);
};
ParseError.prototype = Object.create(CompareAstError.prototype);
ParseError.prototype.code = 1;
ParseError.prototype.message = 'Parse error';

var BindingError = CompareAstError.BindingError = function() {
	CompareAstError.apply(this, arguments);
};
BindingError.prototype = Object.create(CompareAstError.prototype);
BindingError.prototype.code = 2;
BindingError.prototype.message = 'Re-bound variable';

var MatchError = CompareAstError.MatchError = function() {
	CompareAstError.apply(this, arguments);
	this.showDiff = true;
};
MatchError.prototype = Object.create(CompareAstError.prototype);
MatchError.prototype.code = 3;
MatchError.prototype.message = 'Unmatched ASTs';

module.exports = CompareAstError;
