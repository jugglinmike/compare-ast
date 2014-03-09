/**
 * Re-write identifier property access to use literal values, e.g.
 *
 * object.property => object["property"]
 */
module.exports = function(node) {
	if (node.type !== 'MemberExpression' ||
		node.property.type !== 'Identifier') {
		return;
	}

	// When the actual property is an Identifier, compare its literal
	// representation against the expected property.
	node.computed = true;
	var name = node.property.name;
	node.property = {
		type: 'Literal',
		value: name
	};
};
