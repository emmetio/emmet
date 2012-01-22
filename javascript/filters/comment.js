/**
 * Comment important tags (with 'id' and 'class' attributes)
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */zen_coding.require('filters').add('c', (function() {
	/**
	 * Add comments to tag
	 * @param {ZenNode} node
	 */
	function addComments(node, i) {
		var utils = zen_coding.require('utils');
		
		var id_attr = node.getAttribute('id'),
			class_attr = node.getAttribute('class'),
			nl = utils.getNewline();
			
		if (id_attr || class_attr) {
			var comment_str = '',
				padding = (node.parent) ? node.parent.padding : '';
			if (id_attr) comment_str += '#' + id_attr;
			if (class_attr) comment_str += '.' + class_attr;
			
			node.start = node.start.replace(/</, '<!-- ' + comment_str + ' -->' + nl + padding + '<');
			node.end = node.end.replace(/>/, '>' + nl + padding + '<!-- /' + comment_str + ' -->');
			
			// replace counters
			var counter = utils.getCounterForNode(node);
			node.start = utils.replaceCounter(node.start, counter);
			node.end = utils.replaceCounter(node.end, counter);
		}
	}
	
	function process(tree, profile) {
		if (profile.tag_nl === false)
			return tree;
		
		var elemens = zen_coding.require('element');
			
		for (var i = 0, il = tree.children.length; i < il; i++) {
			/** @type {ZenNode} */
			var item = tree.children[i];
			
			if (item.isBlock() && elements.is(item.source, 'parsedElement'))
				addComments(item, i);
			
			process(item, profile);
		}
		
		return tree;
	}
	
	return process;
})());