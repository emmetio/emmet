/**
 * Generic formatting filter: creates proper indentation for each tree node,
 * placing "%s" placeholder where the actual output should be. You can use
 * this filter to preformat tree and then replace %s placeholder to whatever you
 * need. This filter should't be called directly from editor as a part 
 * of abbreviation.
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * @constructor
 * @memberOf __formatFilterDefine
 * @param {Function} require
 * @param {Underscore} _
 */zen_coding.exec(function(require, _){
	var childToken = '${child}';
	var placeholder = '%s';
	
	function getIndentation() {
		return require('resources').getVariable('indentation');
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
	 * Test if passed item is very first child of the whole tree
	 * @param {ZenNode} tree
	 */
	function isVeryFirstChild(item) {
		return item.parent && !item.parent.parent && !item.previousSibling;
	}
	
	/**
	 * Need to add line break before element
	 * @param {ZenNode} node
	 * @param {Object} profile
	 * @return {Boolean}
	 */
	function shouldBreakLine(node, profile) {
		if (!profile.inline_break)
			return false;
			
		// find toppest non-inline sibling
		while (node.previousSibling && node.previousSibling.isInline())
			node = node.previousSibling;
		
		if (!node.isInline())
			return false;
			
		// calculate how many inline siblings we have
		var nodeCount = 1;
		while (node = node.nextSibling) {
			if (node.type == 'text' || !node.isInline())
				nodeCount = 0;
			else if (node.isInline())
				nodeCount++;
		}
		
		return nodeCount >= profile.inline_break;
	}
	
	/**
	 * Need to add newline because <code>item</code> has too many inline children
	 * @param {ZenNode} node
	 * @param {Object} profile
	 */
	function shouldBreakChild(node, profile) {
		// we need to test only one child element, because 
		// hasBlockChildren() method will do the rest
		return node.children.length && shouldBreakLine(node.children[0], profile);
	}
	
	/**
	 * Processes element with <code>snippet</code> type
	 * @param {ZenNode} item
	 * @param {Object} profile
	 * @param {Number} level Depth level
	 */
	function processSnippet(item, profile, level) {
		var utils = require('utils');
		var data = item.source.value;
		var nl = utils.getNewline();
			
		if (!data)
			// snippet wasn't found, process it as tag
			return processTag(item, profile, level);
			
		item.start = item.end = placeholder;
		
		var padding = item.parent 
			? item.parent.padding
			: utils.repeatString(getIndentation(), level);
		
		if (!isVeryFirstChild(item)) {
			item.start = nl + padding + item.start;
		}
		
		// adjust item formatting according to last line of <code>start</code> property
		var parts = data.split(childToken);
		var lines = utils.splitByLines(parts[0] || '');
		var paddingDelta = getIndentation();
			
		if (lines.length > 1) {
			var m = lines[lines.length - 1].match(/^(\s+)/);
			if (m)
				paddingDelta = m[1];
		}
		
		item.padding = padding + paddingDelta;
		
		return item;
	}
	
	/**
	 * Processes element with <code>tag</code> type
	 * @param {ZenNode} item
	 * @param {Object} profile
	 * @param {Number} [level] Depth level
	 */
	function processTag(item, profile, level) {
		if (!item.name)
			// looks like it's a root element
			return item;
		
		item.start = item.end = placeholder;
		var utils = require('utils');
		var isUnary = (item.isUnary() && !item.children.length);
		var nl = utils.getNewline();
			
		// formatting output
		if (profile.tag_nl !== false) {
			var padding = item.parent 
				? item.parent.padding
				: utils.repeatString(getIndentation(), level);
			var forceNl = profile.tag_nl === true;
			var shouldBreak = shouldBreakLine(item, profile);
			
			// formatting block-level elements
			if (item.type != 'text') {
				if (( (item.isBlock() || shouldBreak) && item.parent) || forceNl) {
					// snippet children should take different formatting
					if (!item.parent || (item.parent.type != 'snippet' && !isVeryFirstChild(item)))
						item.start = nl + padding + item.start;
						
					if (item.hasBlockChildren() || shouldBreakChild(item, profile) || (forceNl && !isUnary))
						item.end = nl + padding + item.end;
						
					if (item.hasTagsInContent() || (forceNl && !item.hasChildren() && !isUnary))
						item.start += nl + padding + getIndentation();
				} else if (item.isInline() && hasBlockSibling(item) && !isVeryFirstChild(item)) {
					item.start = nl + padding + item.start;
				} else if (item.isInline() && item.hasBlockChildren()) {
					item.end = nl + padding + item.end;
				}
				
				item.padding = padding + getIndentation();
			}
		}
		
		return item;
	}
	
	/**
	 * Processes simplified tree, making it suitable for output as HTML structure
	 * @param {ZenNode} tree
	 * @param {Object} profile
	 * @param {Number} level Depth level
	 */
	require('filters').add('_format', function process(tree, profile, level) {
		level = level || 0;
		var utils = require('utils');
		
		_.each(tree.children, function(item) {
			item = (item.type == 'tag') 
				? processTag(item, profile, level) 
				: processSnippet(item, profile, level);
			
			if (item.content)
				item.content = utils.padString(item.content, item.padding);
			
			process(item, profile, level + 1);
		});
		
		return tree;
	});
});