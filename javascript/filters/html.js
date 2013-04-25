/**
 * Filter that produces HTML tree
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * @constructor
 * @memberOf __htmlFilterDefine
 * @param {Function} require
 * @param {Underscore} _
 */
emmet.exec(function(require, _) {
	/**
	 * Creates HTML attributes string from tag according to profile settings
	 * @param {AbbreviationNode} node
	 * @param {OutputProfile} profile
	 */
	function makeAttributesString(node, profile) {
		var attrQuote = profile.attributeQuote();
		var cursor = profile.cursor();
		
		return _.map(node.attributeList(), function(a) {
			var attrName = profile.attributeName(a.name);
			return ' ' + attrName + '=' + attrQuote + (a.value || cursor) + attrQuote;
		}).join('');
	}
	
	/**
	 * Processes element with <code>tag</code> type
	 * @param {AbbreviationNode} item
	 * @param {OutputProfile} profile
	 */
	function processTag(item, profile) {
		if (!item.parent) // looks like it's root element
			return item;
		
		var abbrUtils = require('abbreviationUtils');
		var utils = require('utils');
		
		var attrs = makeAttributesString(item, profile); 
		var cursor = profile.cursor();
		var isUnary = abbrUtils.isUnary(item);
		var start= '';
		var end = '';
			
		// define opening and closing tags
		if (!item.isTextNode()) {
			var tagName = profile.tagName(item.name());
			if (isUnary) {
				start = '<' + tagName + attrs + profile.selfClosing() + '>';
				item.end = '';
			} else {
				start = '<' + tagName + attrs + '>';
				end = '</' + tagName + '>';
			}
		}
		
		var placeholder = '%s';
		// We can't just replace placeholder with new value because
		// JavaScript will treat double $ character as a single one, assuming
		// we're using RegExp literal.
		item.start = utils.replaceSubstring(item.start, start, item.start.indexOf(placeholder), placeholder);
		item.end = utils.replaceSubstring(item.end, end, item.end.indexOf(placeholder), placeholder);
		
		// should we put caret placeholder after opening tag?
		if (
				!item.children.length 
				&& !isUnary 
				&& !~item.content.indexOf(cursor)
				&& !require('tabStops').extract(item.content).tabstops.length
			) {
			item.start += cursor;
		}
		
		return item;
	}
	
	/**
	 * Processes simplified tree, making it suitable for output as HTML structure
	 * @param {AbbreviationNode} tree
	 * @param {Object} profile
	 * @param {Number} level Depth level
	 */
	require('filters').add('html', function process(tree, profile, level) {
		level = level || 0;
		var abbrUtils = require('abbreviationUtils');
		
		if (!level) {
			tree = require('filters').apply(tree, '_format', profile);
		}
		
		_.each(tree.children, function(item) {
			if (!abbrUtils.isSnippet(item))
				processTag(item, profile, level);
			
			process(item, profile, level + 1);
		});
		
		return tree;
	});
});