/**
 * Resolves tag names in abbreviations with implied name
 */
zen_coding.exec(function(require, _) {
	/**
	 * Resolves implicit node names in parsed tree
	 * @param {ZenNode} tree
	 */
	function resolveNodeNames(tree) {
		var tagName = require('tagName');
		_.each(tree.children, function(node) {
			if (node.hasImplicitName() || node.data('forceNameResolving')) {
				node._name = tagName.resolve(node.parent.name());
			}
			resolveNodeNames(node);
		});
		
		return tree;
	}
	
	require('abbreviationParser').addPostprocessor(resolveNodeNames);
});