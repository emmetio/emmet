/**
 * Filter for escaping unsafe XML characters: <, >, &
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */(function(){
	var char_map = {
		'<': '&lt;',
		'>': '&gt;',
		'&': '&amp;'
	}
	
	function escapeChars(str) {
		return str.replace(/([<>&])/g, function(str, p1){
			return char_map[p1];
		});
	}
	
	function process(tree, profile, level) {
		for (var i = 0, il = tree.children.length; i < il; i++) {
			/** @type {ZenNode} */
			var item = tree.children[i];
			
			item.start = escapeChars(item.start);
			item.end = escapeChars(item.end);
			
			process(item);
		}
		
		return tree;
	}
	
	zen_coding.registerFilter('e', process);
})();