/**
 * Comment important tags (with 'id' and 'class' attributes)
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */(function(){
	/**
	 * Add comments to tag
	 * @param {ZenNode} node
	 */
	function addComments(node, i) {
		var id_attr = node.getAttribute('id'),
			class_attr = node.getAttribute('class'),
			nl = zen_coding.getNewline();
			
		if (id_attr || class_attr) {
			var comment_str = '',
				padding = (node.parent) ? node.parent.padding : '';
			if (id_attr) comment_str += '#' + id_attr;
			if (class_attr) comment_str += '.' + class_attr;
			
			node.start = node.start.replace(/</, '<!-- ' + comment_str + ' -->' + nl + padding + '<');
			node.end = node.end.replace(/>/, '>' + nl + padding + '<!-- /' + comment_str + ' -->');
			
			// replace counters
			node.start = zen_coding.replaceCounter(node.start, i + 1);
			node.end = zen_coding.replaceCounter(node.end, i + 1);
		}
	}
	
	function process(tree, profile) {
		if (profile.tag_nl === false)
			return tree;
			
		for (var i = 0, il = tree.children.length; i < il; i++) {
			/** @type {ZenNode} */
			var item = tree.children[i];
			
			if (item.isBlock())
				addComments(item, i);
			
			process(item, profile);
		}
		
		return tree;
	}
	
	zen_coding.registerFilter('c', process);
})();