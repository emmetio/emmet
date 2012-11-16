/**
 * Pasted content abbreviation processor. A pasted content is a content that
 * should be inserted into implicitly repeated abbreviation nodes.
 * This processor powers “Wrap With Abbreviation” action
 * @param {Function} require
 * @param {Underscore} _
 */
emmet.exec(function(require, _) {
	var parser = require('abbreviationParser');
	var outputPlaceholder = '$#';
	
	/**
	 * Locates output placeholders inside text
	 * @param {String} text
	 * @returns {Array} Array of ranges of output placeholder in text
	 */
	function locateOutputPlaceholder(text) {
		var range = require('range');
		var result = [];
		
		/** @type StringStream */
		var stream = require('stringStream').create(text);
		
		while (!stream.eol()) {
			if (stream.peek() == '\\') {
				stream.next();
			} else {
				stream.start = stream.pos;
				if (stream.match(outputPlaceholder, true)) {
					result.push(range.create(stream.start, outputPlaceholder));
					continue;
				}
			}
			stream.next();
		}
		
		return result;
	}
	
	/**
	 * Replaces output placeholders inside <code>source</code> with 
	 * <code>value</code>
	 * @param {String} source
	 * @param {String} value
	 * @returns {String}
	 */
	function replaceOutputPlaceholders(source, value) {
		var utils = require('utils');
		var ranges = locateOutputPlaceholder(source);
		
		ranges.reverse();
		_.each(ranges, function(r) {
			source = utils.replaceSubstring(source, value, r);
		});
		
		return source;
	}
	
	/**
	 * Check if parsed node contains output placeholder – a target where
	 * pasted content should be inserted
	 * @param {AbbreviationNode} node
	 * @returns {Boolean}
	 */
	function hasOutputPlaceholder(node) {
		if (locateOutputPlaceholder(node.content).length)
			return true;
		
		// check if attributes contains placeholder
		return !!_.find(node.attributeList(), function(attr) {
			return !!locateOutputPlaceholder(attr.value).length;
		});
	}
	
	/**
	 * Insert pasted content into correct positions of parsed node
	 * @param {AbbreviationNode} node
	 * @param {String} content
	 * @param {Boolean} overwrite Overwrite node content if no value placeholders
	 * found instead of appending to existing content
	 */
	function insertPastedContent(node, content, overwrite) {
		var nodesWithPlaceholders = node.findAll(function(item) {
			return hasOutputPlaceholder(item);
		});
		
		if (hasOutputPlaceholder(node))
			nodesWithPlaceholders.unshift(node);
		
		if (nodesWithPlaceholders.length) {
			_.each(nodesWithPlaceholders, function(item) {
				item.content = replaceOutputPlaceholders(item.content, content);
				_.each(item._attributes, function(attr) {
					attr.value = replaceOutputPlaceholders(attr.value, content);
				});
			});
		} else {
			// on output placeholders in subtree, insert content in the deepest
			// child node
			var deepest = node.deepestChild() || node;
			if (overwrite) {
				deepest.content = content;
			} else {
				deepest.content = require('abbreviationUtils').insertChildContent(deepest.content, content);
			}
		}
	}
	
	/**
	 * @param {AbbreviationNode} tree
	 * @param {Object} options
	 */
	parser.addPreprocessor(function(tree, options) {
		if (options.pastedContent) {
			var utils = require('utils');
			var lines = _.map(utils.splitByLines(options.pastedContent, true), utils.trim);
			
			// set repeat count for implicitly repeated elements before
			// tree is unrolled
			tree.findAll(function(item) {
				if (item.hasImplicitRepeat) {
					item.data('paste', lines);
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
				insertPastedContent(item, pastedContent, !!item.data('pasteOverwrites'));
			}
			
			item.data('paste', null);
			return !!pastedContentObj;
		});
		
		if (!targets.length && options.pastedContent) {
			// no implicitly repeated elements, put pasted content in
			// the deepest child
			insertPastedContent(tree, options.pastedContent);
		}
	});
});