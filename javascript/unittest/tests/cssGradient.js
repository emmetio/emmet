module('CSS Gradient');
test('Parse linear gradient', function() {
	var cssGradient = zen_coding.require('cssGradient');
	var gradient = cssGradient.parse('linear-gradient(top   left, white , #a6f2c0 30%, rgba(180, 200, 210, .9) .8, black 10em)');
	
	equal(gradient.type, 'linear', 'Gradient is linear');
	equal(gradient.direction, 'top left', 'Direction is "top left"');
	equal(gradient.colorStops.length, 4, '4 color stops');
	
	gradient = cssGradient.parse('-webkit-linear-gradient(red, black)');
	ok(gradient, 'Parsed vendor-prefixed gradient');
});

test('Expand abbreviation handler', function() {
	editorStub.setSyntax('css');
	editorStub.replaceContent('.r{a:lg(red, black)$0}');
	
	zen_coding.require('actions').run('expand_abbreviation', editorStub);
	equal(editorStub.getContent(), '.r{a:-webkit-gradient(linear, 0 0, 0 100%, from(red), to(black));a:-webkit-linear-gradient(red, black);a:-moz-linear-gradient(red, black);a:-ms-linear-gradient(red, black);a:-o-linear-gradient(red, black);a:linear-gradient(red, black);}');
	equal(editorStub.getCaretPos(), 234, 'Correctly placed cursor');
	editorStub.setSyntax('html');
});