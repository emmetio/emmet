/**
 * Trim filter: removes characters at the beginning of the text
 * content that indicates lists: numbers, #, *, -, etc.
 * 
 * Useful for wrapping lists with abbreviation.
 * 
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * 
 * @constructor
 * @memberOf __trimFilterDefine
 * @param {Function} require
 * @param {Underscore} _
 */
emmet.exec(function(require, _) {
	require('preferences').define('filter.trimRegexp', '[\\s|\\u00a0]*[\\d|#|\\-|\*|\\u2022]+\\.?\\s*',
			'Regular expression used to remove list markers (numbers, dashes, ' 
			+ 'bullets, etc.) in <code>t</code> (trim) filter. The trim filter '
			+ 'is useful for wrapping with abbreviation lists, pased from other ' 
			+ 'documents (for example, Word documents).');
	
	function process(tree, re) {
		_.each(tree.children, function(item) {
			if (item.content)
				item.content = item.content.replace(re, '');
			
			process(item, re);
		});
		
		return tree;
	}
	
	require('filters').add('t', function(tree) {
		var re = new RegExp(require('preferences').get('filter.trimRegexp'));
		return process(tree, re);
	});
});