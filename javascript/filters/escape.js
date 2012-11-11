/**
 * Filter for escaping unsafe XML characters: <, >, &
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */emmet.exec(function(require, _) {
	var charMap = {
		'<': '&lt;',
		'>': '&gt;',
		'&': '&amp;'
	};
	
	function escapeChars(str) {
		return str.replace(/([<>&])/g, function(str, p1){
			return charMap[p1];
		});
	}
	
	require('filters').add('e', function process(tree) {
		_.each(tree.children, function(item) {
			item.start = escapeChars(item.start);
			item.end = escapeChars(item.end);
			item.content = escapeChars(item.content);
			process(item);
		});
		
		return tree;
	});
});