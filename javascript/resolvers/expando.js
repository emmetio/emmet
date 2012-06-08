/**
 * Expando (elements like 'dl+') resolver
 * @author Sergey Chikuyonok (serge.che@gmail.com) <http://chikuyonok.ru>
 * @param {Function} require
 * @param {Underscore} _
 */
zen_coding.exec(function(require, _) {
	var res = require('resources');
	/**
	 * @param {TreeNode} node
	 * @param {String} syntax
	 */
	res.addResolver(function(node, syntax) {
		if (node.isElement() && ~node.name.indexOf('+')) {
			// it's expando
			var a = res.getAbbreviation(syntax, node.name);
			if (a) {
				return require('transform').createParsedTree(a.data, syntax);
			}
		}
		
		return null;
	});
});