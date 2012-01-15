/**
 * Filter that produces HTML tree
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * 
 * @include "../zen_coding.js"
 */
(function(){
	var child_token = '${child}',
		tabstops = 0;
		
	/**
	 * Returns proper string case, depending on profile value
	 * @param {String} val String to process
	 * @param {String} case_param Profile's case value ('lower', 'upper', 'leave')
	 */
	function processStringCase(val, case_param) {
		switch (String(case_param || '').toLowerCase()) {
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
		var attrs = '',
			attr_quote = profile.attr_quotes == 'single' ? "'" : '"',
			cursor = profile.place_cursor ? zen_coding.getCaretPlaceholder() : '',
			attr_name;
			
		for (var i = 0; i < tag.attributes.length; i++) {
			var a = tag.attributes[i];
			attr_name = processStringCase(a.name, profile.attr_case);
			attrs += ' ' + attr_name + '=' + attr_quote + (a.value || cursor) + attr_quote;
		}
		
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
			
		if (!data)
			// snippet wasn't found, process it as tag
			return processTag(item, profile, level);
			
		var parts = data.split(child_token),
			start = parts[0] || '',
			end = parts[1] || '',
			padding = item.parent ? item.parent.padding : '';
			
			
		item.start = item.start.replace('%s', zen_coding.padString(start, padding));
		item.end = item.end.replace('%s', zen_coding.padString(end, padding));
		
		var startPlaceholderNum = 100;
		var placeholderMemo = {};
		
		// replace variables ID and CLASS
		var cb = function(str, varName) {
			var attr = item.getAttribute(varName);
			if (attr !== null)
				return attr;
			
			var varValue = zen_coding.getVariable(varName);
			if (varValue)
				return varValue;
			
			// output as placeholder
			if (!placeholderMemo[varName])
				placeholderMemo[varName] = startPlaceholderNum++;
				
			return '${' + placeholderMemo[varName] + ':' + varName + '}';
		};
		
		item.start = zen_coding.replaceVariables(item.start, cb);
		item.end = zen_coding.replaceVariables(item.end, cb);
		
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
			cursor = profile.place_cursor ? zen_coding.getCaretPlaceholder() : '',
			self_closing = '',
			is_unary = (item.isUnary() && !item.children.length),
			start= '',
			end = '';
		
		if (profile.self_closing_tag == 'xhtml')
			self_closing = ' /';
		else if (profile.self_closing_tag === true)
			self_closing = '/';
			
		// define opening and closing tags
		if (item.type != 'text') {
			var tag_name = processStringCase(item.name, profile.tag_case);
			if (is_unary) {
				start = '<' + tag_name + attrs + self_closing + '>';
				item.end = '';
			} else {
				start = '<' + tag_name + attrs + '>';
				end = '</' + tag_name + '>';
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
		
		if (!item.children.length && !is_unary && item.content.indexOf(cursor) == -1)
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
		if (level == 0) {
			tree = zen_coding.runFilters(tree, profile, '_format');
			tabstops = 0;
		}
		
		for (var i = 0, il = tree.children.length; i < il; i++) {
			/** @type {ZenNode} */
	
			var item = tree.children[i];
			item = (item.type == 'tag') 
				? processTag(item, profile, level) 
				: processSnippet(item, profile, level);
			
			// replace counters
			var counter = zen_coding.getCounterForNode(item);
			item.start = zen_coding.unescapeText(zen_coding.replaceCounter(item.start, counter));
			item.end = zen_coding.unescapeText(zen_coding.replaceCounter(item.end, counter));
			item.content = zen_coding.unescapeText(zen_coding.replaceCounter(item.content, counter));
			
			tabstops += zen_coding.upgradeTabstops(item, tabstops) + 1;
			
			process(item, profile, level + 1);
		}
		
		return tree;
	}
	
	zen_coding.registerFilter('html', process);
})();