/**
 * Process CSS properties: replaces snippets, augumented with ! char, with 
 * <em>!important</em> suffix 
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */(function(){
	var re_important = /(.+)\!$/;
	function process(tree, profile) {
		for (var i = 0, il = tree.children.length; i < il; i++) {
			/** @type {ZenNode} */
			var item = tree.children[i];
			
			// CSS properties are always snippets
			if (item.type == 'snippet' && re_important.test(item.real_name)) {
				item.start = item.start.replace(/(;?)$/, ' !important$1');
			}
			
			process(item, profile);
		}
		
		return tree;
	}
	
	zen_coding.registerFilter('css', process);
})();