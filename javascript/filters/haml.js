/**
 * Filter that produces HAML tree
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * 
 * @include "../zen_coding.js"
 */
(function(){
	var child_token = '${child}';
	
	/**
	 * Returns proper string case, depending on profile value
	 * @param {String} val String to process
	 * @param {String} caseParam Profile's case value ('lower', 'upper', 'leave')
	 */
	function processStringCase(val, caseParam) {
		switch (String(caseParam || '').toLowerCase()) {
			case 'lower':
				return val.toLowerCase();
			case 'upper':
				return val.toUpperCase();
		}
		
		return val;
	}
	
	/**
	 * Creates HTML attributes string from tag according to profile settings
	 * @param {ZenNode} tag
	 * @param {default_profile} profile
	 */
	function makeAttributesString(tag, profile) {
		// make attribute string
		var attrs = '';
		var otherAttrs = [];
		var attrQuote = profile.attr_quotes == 'single' ? "'" : '"';
		var cursor = profile.place_cursor ? zen_coding.require('utils').getCaretPlaceholder() : '';
		
		/** @type Underscore */
		var _ = zen_coding.require('_');
		
		_.each(tag.attributes, function(a) {
			switch (a.name.toLowerCase()) {
				// use short notation for ID and CLASS attributes
				case 'id':
					attrs += '#' + (a.value || cursor);
					break;
				case 'class':
					attrs += '.' + (a.value || cursor);
					break;
				// process other attributes
				default:
					var attrName = processStringCase(a.name, profile.attr_case);
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
	 * @param {Number} [level] Depth level
	 */
	function processSnippet(item, profile, level) {
		var data = item.source.value;
		var utils = zen_coding.require('utils');
		var res = zen_coding.require('resources');
			
		if (!data)
			// snippet wasn't found, process it as tag
			return processTag(item, profile, level);
			
		var parts = data.split(child_token),
			start = parts[0] || '',
			end = parts[1] || '',
			padding = item.parent ? item.parent.padding : '';
			
		item.start = item.start.replace('%s', utils.padString(start, padding));
		item.end = item.end.replace('%s', utils.padString(end, padding));
		
		var startPlaceholderNum = 100;
		var placeholderMemo = {};
		
		// replace variables ID and CLASS
		var cb = function(str, varName) {
			var attr = item.getAttribute(varName);
			if (attr !== null)
				return attr;
			
			var varValue = res.getVariable(varName);
			if (varValue)
				return varValue;
			
			// output as placeholder
			if (!placeholderMemo[varName])
				placeholderMemo[varName] = startPlaceholderNum++;
				
			return '${' + placeholderMemo[varName] + ':' + varName + '}';
		};
		
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
		return (item.parent && item.parent.hasBlockChildren());
	}
	
	/**
	 * Processes element with <code>tag</code> type
	 * @param {ZenNode} item
	 * @param {Object} profile
	 * @param {Number} [level] Depth level
	 */
	function processTag(item, profile, level) {
		if (!item.name)
			// looks like it's root element
			return item;
		
		var attrs = makeAttributesString(item, profile), 
			content = '', 
			cursor = profile.place_cursor ? zen_coding.require('utils').getCaretPlaceholder() : '',
			self_closing = '',
			is_unary = (item.isUnary() && !item.children.length),
			start= '',
			end = '';
		
		if (profile.self_closing_tag && is_unary)
			self_closing = '/';
			
		// define tag name
		var tag_name = '%' + ((profile.tag_case == 'upper') ? item.name.toUpperCase() : item.name.toLowerCase());
		if (tag_name.toLowerCase() == '%div' && attrs && attrs.indexOf('{') == -1)
			// omit div tag
			tag_name = '';
			
		item.end = '';
		start = tag_name + attrs + self_closing + ' ';
		
		var placeholder = '%s';
		// We can't just replace placeholder with new value because
		// JavaScript will treat double $ character as a single one, assuming
		// we're using RegExp literal. 
		var pos = item.start.indexOf(placeholder);
		item.start = item.start.substring(0, pos) + start + item.start.substring(pos + placeholder.length);
		
		if (!item.children.length && !is_unary)
			item.start += cursor;
		
		return item;
	}
	
	/**
	 * Processes simplified tree, making it suitable for output as HTML structure
	 * @param {ZenNode} tree
	 * @param {Object} profile
	 * @param {Number} [level] Depth level
	 */
	function process(tree, profile, level) {
		level = level || 0;
		/** @type Underscore */
		var _ = zen_coding.require('_');
		/** @type zen_coding.utils */
		var utils = zen_coding.require('utils');
		var editorUtils = zen_coding.require('editorUtils');
		var elements = zen_coding.require('elements');
		
		if (level == 0)
			// preformat tree
			tree = zen_coding.require('filters').apply(tree, '_format', profile);
		
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
	}
	
	zen_coding.require('filters').add('haml', process);
})();