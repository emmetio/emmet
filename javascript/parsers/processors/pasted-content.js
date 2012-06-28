/**
 * Pasted content abbreviation processor. A pasted content is a content that
 * should be inserted into implicitly repeated abbreviation nodes.
 * This processor powers “Wrap With Abbreviation” action
 */
zen_coding.exec(function(require, _) {
	var parser = require('abbreviationParser2');
	/**
	 * @param {AbbreviationNode} tree
	 * @param {Object} options
	 */
	parser.addPreprocessor(function(tree, options) {
		if (options.pastedContent) {
			var lines = require('utils').splitByLines(options.pastedContent, true);
			// set repeat count for implicitly repeated elements before
			// tree is unrolled
			var targets = tree.findAll(function(item) {
				if (item.hasImplicitRepeat) {
					item.data('paste', lines);
					return item.repeatCount = lines.length;
				}
			});
			
			if (!targets.length) {
				// no implicitly repeated elements, put pasted content in
				// the deepest child
				var deepest = tree.deepestChild();
				if (deepest)
					deepest.data('paste', content);
			}
		}
	});
	
	/**
	 * @param {AbbreviationNode} tree
	 * @param {Object} options
	 */
	parser.addPostprocessor(function(tree, options) {
		// for each node with pasted content, update text data
		tree.findAll(function(item) {
			var pastedContent = item.data('paste');
			if (_.isArray(pastedContent)) {
				item._text += pastedContent[item.counter - 1];
			} else if (_.isFunction(pastedContent)) {
				item._text = pastedContent(item.counter - 1, item._text);	
			} else if (pastedContent) {
				item._text += pastedContent;
			}
			
			item.data('paste', null);
		});
	});
});