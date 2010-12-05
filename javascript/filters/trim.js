/**
 * Trim filter: removes characters at the beginning of the text
 *  content that indicates lists: numbers, #, *, -, etc.
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */
(function(){
	function process(tree, profile, level) {
		for (var i = 0, il = tree.children.length; i < il; i++) {
			/** @type {ZenNode} */
			var item = tree.children[i];
			
			if (item.content)
				item.content = item.content.replace(/^([\s|\u00a0])?[\d|#|\-|\*|\u2022]+\.?\s*/, '$1');
			
			process(item);
		}
		
		return tree;
	}
	
	zen_coding.registerFilter('t', process);
})();