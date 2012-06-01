/**
 * Filter that produces HTML tree
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * @constructor
 * @memberOf __htmlFilterDefine
 * @param {Function} require
 * @param {Underscore} _
 */
zen_coding.exec(function(require, _) {
	var childToken = '${child}';
	var tabstops = 0;
		
	/**
	 * Creates HTML attributes string from tag according to profile settings
	 * @param {ZenNode} tag
	 * @param {Object} profile
	 */
	function makeAttributesString(tag, profile) {
		var p = require('profile');
		// make attribute string
		var attrQuote = p.quote(profile.attr_quotes);
		var cursor = profile.place_cursor ? require('utils').getCaretPlaceholder() : '';
		
		return _.map(tag.attributes, function(a) {
			var attrName = p.stringCase(a.name, profile.attr_case);
			return ' ' + attrName + '=' + attrQuote + (a.value || cursor) + attrQuote;
		}).join('');
	}
	
	/**
	 * Processes element with <code>snippet</code> type
	 * @param {ZenNode} item
	 * @param {Object} profile
	 * @param {Number} level Depth level
	 */
	function processSnippet(item, profile, level) {
		var data = item.source.value;
		if (!data)
			// snippet wasn't found, process it as tag
			return processTag(item, profile, level);
			
		var utils = require('utils');
		var parts = data.split(childToken);
		var padding = item.parent ? item.parent.padding : '';
			
		item.start = item.start.replace('%s', utils.padString(parts[0] || '', padding));
		item.end = item.end.replace('%s', utils.padString(parts[1] || '', padding));
		
		var cb = require('tabStops').variablesResolver(item);
		item.start = utils.replaceVariables(item.start, cb);
		item.end = utils.replaceVariables(item.end, cb);
		
		return item;
	}
	
	/**
	 * Test if passed node has block-level sibling element
	 * @param {ZenNode} item
	 * @return {Boolean}
	 */
	function hasBlockSibling(item) {
		return item.parent && item.parent.hasBlockChildren();
	}
	
	/**
	 * Processes element with <code>tag</code> type
	 * @param {ZenNode} item
	 * @param {Object} profile
	 * @param {Number} level Depth level
	 */
	function processTag(item, profile, level) {
		if (!item.name) // looks like it's root element
			return item;
		
		var p = require('profile');
		
		var attrs = makeAttributesString(item, profile); 
		var cursor = profile.place_cursor ? require('utils').getCaretPlaceholder() : '';
		var isUnary = item.isUnary() && !item.children.length;
		var start= '';
		var end = '';
			
		// define opening and closing tags
		if (item.type != 'text') {
			var tagName = p.stringCase(item.name, profile.tag_case);
			if (isUnary) {
				start = '<' + tagName + attrs + p.selfClosing(profile.self_closing_tag) + '>';
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
		var pos = item.start.indexOf(placeholder);
		item.start = item.start.substring(0, pos) + start + item.start.substring(pos + placeholder.length);
		
		pos = item.end.indexOf(placeholder);
		item.end = item.end.substring(0, pos) + end + item.end.substring(pos + placeholder.length);
		
		if (!item.children.length && !isUnary && item.content.indexOf(cursor) == -1)
			item.start += cursor;
		
		return item;
	}
	
	/**
	 * Processes simplified tree, making it suitable for output as HTML structure
	 * @param {ZenNode} tree
	 * @param {Object} profile
	 * @param {Number} level Depth level
	 */
	require('filters').add('html', function process(tree, profile, level) {
		level = level || 0;
		var ts = require('tabStops');
		
		if (level == 0) {
			tree = require('filters').apply(tree, '_format', profile);
			tabstops = 0;
			ts.resetPlaceholderCounter();
		}
		
		var utils = require('utils');
		var editorUtils = require('editorUtils');
		var elements = require('elements');
		
		_.each(tree.children, function(item) {
			item = elements.is(item.source, 'parsedElement') 
				? processTag(item, profile, level) 
				: processSnippet(item, profile, level);
			
			// replace counters
			var counter = editorUtils.getCounterForNode(item);
			item.start = utils.unescapeText(utils.replaceCounter(item.start, counter));
			item.end = utils.unescapeText(utils.replaceCounter(item.end, counter));
			item.content = utils.unescapeText(utils.replaceCounter(item.content, counter));
			
			tabstops += ts.upgrade(item, tabstops) + 1;
			
			process(item, profile, level + 1);
		});
		
		return tree;
	});
});