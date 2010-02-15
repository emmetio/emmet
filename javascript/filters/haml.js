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
	 * Creates HTML attributes string from tag according to profile settings
	 * @param {ZenNode} tag
	 * @param {default_profile} profile
	 */
	function makeAttributesString(tag, profile) {
		// make attribute string
		var attrs = '',
			attr_quote = profile.attr_quotes == 'single' ? "'" : '"',
			cursor = profile.place_cursor ? zen_coding.getCaretPlaceholder() : '',
			attr_name, 
			i,
			a;
			
		// use short notation for ID and CLASS attributes
		for (i = 0; i < tag.attributes.length; i++) {
			a = tag.attributes[i];
			switch (a.name.toLowerCase()) {
				case 'id':
					attrs += '#' + (a.value || cursor);
					break;
				case 'class':
					attrs += '.' + (a.value || cursor);
					break;
			}
		}
		
		var other_attrs = [];
		
		// process other attributes
		for (i = 0; i < tag.attributes.length; i++) {
			a = tag.attributes[i];
			var attr_name_lower = a.name.toLowerCase();
			if (attr_name_lower != 'id' && attr_name_lower != 'class') {
				attr_name = (profile.attr_case == 'upper') ? a.name.toUpperCase() : attr_name_lower;
				other_attrs.push(':' +attr_name + ' => ' + attr_quote + (a.value || cursor) + attr_quote);
			}
		}
		
		if (other_attrs.length)
			attrs += '{' + other_attrs.join(', ') + '}';
		
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
		
		if (profile.self_closing_tag && is_unary)
			self_closing = '/';
			
		// define tag name
		var tag_name = '%' + ((profile.tag_case == 'upper') ? item.name.toUpperCase() : item.name.toLowerCase());
		if (tag_name.toLowerCase() == '%div' && attrs && attrs.indexOf('{') == -1)
			// omit div tag
			tag_name = '';
			
		item.end = '';
		start = tag_name + attrs + self_closing;
		
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
		if (level == 0)
			// preformat tree
			tree = zen_coding.runFilters(tree, profile, '_format');
		
		for (var i = 0, il = tree.children.length; i < il; i++) {
			/** @type {ZenNode} */
			var item = tree.children[i];
			item = (item.type == 'tag') 
				? processTag(item, profile, level) 
				: processSnippet(item, profile, level);
			
			// replace counters
			item.start = zen_coding.replaceCounter(item.start, i + 1);
			item.end = zen_coding.replaceCounter(item.end, i + 1);
			process(item, profile, level + 1);
		}
		
		return tree;
	}
	
	zen_coding.registerFilter('haml', process);
})();