/**
 * Updates CSS abbreviations like 'd:n!' with <i>!important</i> modifier.
 * @author Sergey Chikuyonok (serge.che@gmail.com) <http://chikuyonok.ru>
 * @param {Array} match Regexp match object
 * @param {TreeNode} node Matched abbreviation node
 * @param {String} syntax Current syntax
 */
zen_coding.require('resources').addGenerator(/^(.+)\!$/, function(match, node, syntax) {
	if (syntax != 'css')
		return null;
	
	var res = zen_coding.require('resources');
	var elems = zen_coding.require('elements');
	
	// generate parsed snippet
	var source = res.getSnippet(syntax, match[1]);
	if (source) {
		var parsedSnippet = elems.create('parsedSnippet', node, syntax, source);
		if (~parsedSnippet.value.indexOf(';')) {
			parsedSnippet.value = parsedSnippet.value.split(';').join(' !important;');
		} else {
			parsedSnippet.value += ' !important';
		}
		
		return parsedSnippet;
	}
	
	return null;
});
