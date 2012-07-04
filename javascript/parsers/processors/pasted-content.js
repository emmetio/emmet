/**
 * Pasted content abbreviation processor. A pasted content is a content that
 * should be inserted into implicitly repeated abbreviation nodes.
 * This processor powers “Wrap With Abbreviation” action
 */
zen_coding.exec(function(require, _) {
	var parser = require('abbreviationParser');
	
	/**
	 * @param {AbbreviationNode} tree
	 * @param {Object} options
	 */
	parser.addPreprocessor(function(tree, options) {
		if (options.pastedContent) {
			var lines = require('utils').splitByLines(options.pastedContent, true);
			// set repeat count for implicitly repeated elements before
			// tree is unrolled
			tree.findAll(function(item) {
				if (item.hasImplicitRepeat) {
					// TODO replace $# tokens
					(item.deepestChild() || item).data('paste', lines);
					return item.repeatCount = lines.length;
				}
			});
		}
	});
	
	/**
	 * @param {AbbreviationNode} tree
	 * @param {Object} options
	 */
	parser.addPostprocessor(function(tree, options) {
		var abbrUtils = require('abbreviationUtils');
		// for each node with pasted content, update text data
		var targets = tree.findAll(function(item) {
			var pastedContentObj = item.data('paste');
			var pastedContent = '';
			if (_.isArray(pastedContentObj)) {
				pastedContent = pastedContentObj[item.counter - 1];
			} else if (_.isFunction(pastedContentObj)) {
				pastedContent = pastedContentObj(item.counter - 1, item.content);
			} else if (pastedContentObj) {
				pastedContent = pastedContentObj;
			}
			
			if (pastedContent) {
				item.content = abbrUtils.insertChildContent(item.content, pastedContent);
			}
			
			item.data('paste', null);
			return !_.isUndefined(pastedContentObj);
		});
		
		if (!targets.length && options.pastedContent) {
			// no implicitly repeated elements, put pasted content in
			// the deepest child
			var deepest = tree.deepestChild() || tree;
			deepest.content = abbrUtils.insertChildContent(deepest.content, options.pastedContent);
		}
	});
});