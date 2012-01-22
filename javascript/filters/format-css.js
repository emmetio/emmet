/**
 * Format CSS properties: add space after property name:
 * padding:0; → padding: 0;
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */(function(){
	function process(tree, profile) {
		var elements = zen_coding.require('elements');
		for (var i = 0, il = tree.children.length; i < il; i++) {
			/** @type {ZenNode} */
			var item = tree.children[i];
			
			// CSS properties are always snippets 
			if (elements.is(item.source, 'parsedSnippet')) {
				item.start = item.start.replace(/([\w\-]+\s*:)(?!:)\s*/, '$1 ');
			}
			
			process(item, profile);
		}
		
		return tree;
	}
	
	zen_coding.require('filters').add('fc', process);
})();