/**
 * Sample generator
 */
zen_coding.addGenerator(/sample(\d*)/i, function(match, abbr, syntax) {
	return 'You entered sample abbreviation with number ' + match[1];
});