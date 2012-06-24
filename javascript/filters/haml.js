/**
 * Filter for producing HAML code from abbreviation.
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * @constructor
 * @memberOf __hamlFilterDefine
 * @param {Function} require
 * @param {Underscore} _
 */
zen_coding.exec(function(require, _) {
	var childToken = '${child}';
	
	function transformClassName(className) {
		return require('utils').trim(className).replace(/\s+/g, '.');
	}
	
	/**
	 * Creates HAML attributes string from tag according to profile settings
	 * @param {ZenNode} tag
	 * @param {Object} profile
	 */
	function makeAttributesString(tag, profile) {
		var p = require('profile');
		// make attribute string
		var attrs = '';
		var otherAttrs = [];
		var attrQuote = profile.attr_quotes == 'single' ? "'" : '"';
		var cursor = profile.place_cursor ? require('utils').getCaretPlaceholder() : '';
		
		_.each(tag.attributes, function(a) {
			switch (a.name.toLowerCase()) {
				// use short notation for ID and CLASS attributes
				case 'id':
					attrs += '#' + (a.value || cursor);
					break;
				case 'class':
					attrs += '.' + transformClassName(a.value || cursor);
					break;
				// process other attributes
				default:
					var attrName = p.stringCase(a.name, profile.attr_case);
					otherAttrs.push(':' +attrName + ' => ' + attrQuote + (a.value || cursor) + attrQuote);
			}
		});
		
		if (otherAttrs.length)
			attrs += '{' + otherAttrs.join(', ') + '}';
		
		return attrs;
	}
	
	/**
	 * Processes element with <code>snippet</code> type
	 * @param {ZenNode} item
	 * @param {Object} profile
	 * @param {Number} level Depth level
	 */
	function processSnippet(item, profile, level) {
		var data = item.source.value;
		var utils = require('utils');
			
		if (!data)
			// snippet wasn't found, process it as tag
			return processTag(item, profile, level);
			
		var parts = data.split(childToken);
		var start = parts[0] || '';
		var end = parts[1] || '';
		var padding = item.parent ? item.parent.padding : '';
			
		item.start = item.start.replace('%s', utils.padString(start, padding));
		item.end = item.end.replace('%s', utils.padString(end, padding));
		
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
		if (!item.name)
			// looks like it's root element
			return item;
		
		var p = require('profile');
		var attrs = makeAttributesString(item, profile);
		var cursor = profile.place_cursor ? require('utils').getCaretPlaceholder() : '';
		var isUnary = item.isUnary() && !item.children.length;
		var selfClosing = profile.self_closing_tag && isUnary ? '/' : '';
		var start= '';
			
		// define tag name
		var tagName = '%' + p.stringCase(item.name, profile.tag_case);
		if (tagName.toLowerCase() == '%div' && attrs && attrs.indexOf('{') == -1)
			// omit div tag
			tagName = '';
			
		item.end = '';
		start = tagName + attrs + selfClosing + ' ';
		
		var placeholder = '%s';
		// We can't just replace placeholder with new value because
		// JavaScript will treat double $ character as a single one, assuming
		// we're using RegExp literal. 
		var pos = item.start.indexOf(placeholder);
		item.start = item.start.substring(0, pos) + start + item.start.substring(pos + placeholder.length);
		
		if (!item.children.length && !isUnary)
			item.start += cursor;
		
		return item;
	}
	
	/**
	 * Processes simplified tree, making it suitable for output as HTML structure
	 * @param {ZenNode} tree
	 * @param {Object} profile
	 * @param {Number} level Depth level
	 */
	require('filters').add('haml', function process(tree, profile, level) {
		level = level || 0;
		/** @type zen_coding.utils */
		var utils = require('utils');
		var editorUtils = require('editorUtils');
		var elements = require('elements');
		
		if (level == 0) {
			// preformat tree
			tree = require('filters').apply(tree, '_format', profile);
			require('tabStops').resetPlaceholderCounter();
		}
		
		_.each(tree.children, function(item) {
			item = elements.is(item.source, 'parsedElement') 
				? processTag(item, profile, level) 
				: processSnippet(item, profile, level);
			
			// replace counters
			var counter = editorUtils.getCounterForNode(item);
			item.start = utils.unescapeText(utils.replaceCounter(item.start, counter));
			item.end = utils.unescapeText(utils.replaceCounter(item.end, counter));
			
			process(item, profile, level + 1);
		});
		
		return tree;
	});
});