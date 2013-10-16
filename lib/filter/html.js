/**
 * Filter that produces HTML tree
 */
if (typeof module === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		module.exports = factory(require, exports, module);
	};
}

define(function(require, exports, module) {
	var _ = require('lodash');
	var abbrUtils = require('../utils/abbreviation');
	var utils = require('../utils/common');
	var tabStops = require('../assets/tabStops');
	var filterCore = require('./main');

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
		if (!item.parent) { // looks like it's root element
			return item;
		}
		
		var attrs = makeAttributesString(item, profile); 
		var cursor = profile.cursor();
		var isUnary = abbrUtils.isUnary(item);
		var start = '';
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
				&& !tabStops.extract(item.content).tabstops.length
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
	filterCore.add('html', function process(tree, profile, level) {
		level = level || 0;
		
		if (!level) {
			tree = filterCore.apply(tree, '_format', profile);
		}
		
		_.each(tree.children, function(item) {
			if (!abbrUtils.isSnippet(item)) {
				processTag(item, profile, level);
			}
			
			process(item, profile, level + 1);
		});
		
		return tree;
	});
});