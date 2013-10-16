/**
 * Filter for producing HAML code from abbreviation.
 */
if (typeof module === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		module.exports = factory(require, exports, module);
	};
}

define(function(require, exports, module) {
	var _ = require('lodash');
	var utils = require('../utils/common');
	var abbrUtils = require('../utils/abbreviation');
	var filterCore = require('./main');

	function transformClassName(className) {
		return utils.trim(className).replace(/\s+/g, '.');
	}
	
	/**
	 * Creates HAML attributes string from tag according to profile settings
	 * @param {AbbreviationNode} tag
	 * @param {Object} profile
	 */
	function makeAttributesString(tag, profile) {
		var attrs = '';
		var otherAttrs = [];
		var attrQuote = profile.attributeQuote();
		var cursor = profile.cursor();
		
		_.each(tag.attributeList(), function(a) {
			var attrName = profile.attributeName(a.name);
			switch (attrName.toLowerCase()) {
				// use short notation for ID and CLASS attributes
				case 'id':
					attrs += '#' + (a.value || cursor);
					break;
				case 'class':
					attrs += '.' + transformClassName(a.value || cursor);
					break;
				// process other attributes
				default:
					otherAttrs.push(':' +attrName + ' => ' + attrQuote + (a.value || cursor) + attrQuote);
			}
		});
		
		if (otherAttrs.length)
			attrs += '{' + otherAttrs.join(', ') + '}';
		
		return attrs;
	}
	
	/**
	 * Processes element with <code>tag</code> type
	 * @param {AbbreviationNode} item
	 * @param {OutputProfile} profile
	 */
	function processTag(item, profile) {
		if (!item.parent)
			// looks like it's root element
			return item;
		
		var attrs = makeAttributesString(item, profile);
		var cursor = profile.cursor();
		var isUnary = abbrUtils.isUnary(item);
		var selfClosing = profile.self_closing_tag && isUnary ? '/' : '';
		var start= '';
			
		// define tag name
		var tagName = '%' + profile.tagName(item.name());
		if (tagName.toLowerCase() == '%div' && attrs && attrs.indexOf('{') == -1)
			// omit div tag
			tagName = '';
			
		item.end = '';
		start = tagName + attrs + selfClosing + ' ';
		
		var placeholder = '%s';
		// We can't just replace placeholder with new value because
		// JavaScript will treat double $ character as a single one, assuming
		// we're using RegExp literal.
		item.start = utils.replaceSubstring(item.start, start, item.start.indexOf(placeholder), placeholder);
		
		if (!item.children.length && !isUnary)
			item.start += cursor;
		
		return item;
	}
	
	/**
	 * Processes simplified tree, making it suitable for output as HTML structure
	 * @param {AbbreviationNode} tree
	 * @param {Object} profile
	 * @param {Number} level Depth level
	 */
	filterCore.add('haml', function process(tree, profile, level) {
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