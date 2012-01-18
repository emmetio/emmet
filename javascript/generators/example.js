/**
 * Sample generator
 */
zen_coding.addGenerator(/sample(\d*)/i, function(match, abbr, node, syntax) {
	return 'You entered sample abbreviation with number ' + match[1];
});

zen_coding.addGenerator(/tt/, function(match, abbr, node, syntax) {
	if (node.getAttribute('class')) {
		return 'TT with class |' + node.getAttribute('class');
	}
	
	if (node.getAttribute('id')) {
		return zen_coding.dataType.element('p', node.attributes);
	} 
	
	return 'TT!';
});