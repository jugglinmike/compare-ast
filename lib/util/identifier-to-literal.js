// Given an Identifier node, create an equivalent Literal node
module.exports = function(identifier) {
	var literal = {
		type: 'Literal'
	};
	literal.value = identifier.name;
	return literal;
};
