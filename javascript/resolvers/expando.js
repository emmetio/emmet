/**
 * Expando (elements like 'dl+') resolver
 * @author Sergey Chikuyonok (serge.che@gmail.com) <http://chikuyonok.ru>
 * @param {TreeNode} node
 * @param {String} syntax
 */
zen_coding.require('resources').addResolver(function(node, syntax) {
	if (node.isElement() && ~node.name.indexOf('+')) {
		// it's expando
		var a = this.getAbbreviation(syntax, node.name);
		if (a) {
			return zen_coding.require('transform').createParsedTree(a.data, syntax);
		}
	}
	
	return null;
});