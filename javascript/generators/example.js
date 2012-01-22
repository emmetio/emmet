/**
 * Sample generator
 */
var res = zen_coding.require('resources');
res.addGenerator(/sample(\d*)/i, function(match, abbr, node, syntax) {
	return 'You entered sample abbreviation with number ' + match[1];
});

res.addGenerator(/tt/, function(match, abbr, node, syntax) {
	if (node.getAttribute('class')) {
		return 'TT with class |' + node.getAttribute('class');
	}
	
	if (node.getAttribute('id')) {
		return zen_coding.require('elements').create('element', 'p', node.attributes);
	} 
	
	return 'TT!';
});