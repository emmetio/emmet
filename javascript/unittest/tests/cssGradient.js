module('CSS Gradient');
test('Parse linear gradient', function() {
	var cssGradient = emmet.require('cssGradient');
	var gradient = cssGradient.parse('linear-gradient(top   left, white , #a6f2c0 30%, rgba(180, 200, 210, .9) .8, black 10em)');
	
	equal(gradient.type, 'linear', 'Gradient is linear');
	equal(gradient.direction, 'top left', 'Direction is "top left"');
	equal(gradient.colorStops.length, 4, '4 color stops');
	
	gradient = cssGradient.parse('-webkit-linear-gradient(red, black)');
	ok(gradient, 'Parsed vendor-prefixed gradient');
});

test('Expand abbreviation handler', function() {
	var prefs = emmet.require('preferences');
	
	editorStub.setSyntax('css');
	editorStub.replaceContent('.r{background:lg(red, black)$0}');
	
	emmet.require('actions').run('expand_abbreviation', editorStub);
	equal(editorStub.getContent(), '.r{background:-webkit-gradient(linear, 0 0, 0 100%, from(red), to(black));background:-webkit-linear-gradient(red, black);background:-moz-linear-gradient(red, black);background:-o-linear-gradient(red, black);background:linear-gradient(red, black);}');
	equal(editorStub.getCaretPos(), 245, 'Correctly placed cursor');
	
	// expand gradient outside value
	editorStub.replaceContent('.r{\n\tlg(red, black)$0\n}');
	emmet.require('actions').run('expand_abbreviation', editorStub);
	equal(editorStub.getContent(), '.r{\n\tbackground-image: -webkit-gradient(linear, 0 0, 0 100%, from(red), to(black));\n\tbackground-image: -webkit-linear-gradient(red, black);\n\tbackground-image: -moz-linear-gradient(red, black);\n\tbackground-image: -o-linear-gradient(red, black);\n\tbackground-image: linear-gradient(red, black);\n}');
	
	// test fallback value
	prefs.set('css.gradient.fallback', true);
	editorStub.replaceContent('.r{\n\tlg(red, black)$0\n}');
	emmet.require('actions').run('expand_abbreviation', editorStub);
	equal(editorStub.getContent(), '.r{\n\tbackground-color: red;\n\tbackground-image: -webkit-gradient(linear, 0 0, 0 100%, from(red), to(black));\n\tbackground-image: -webkit-linear-gradient(red, black);\n\tbackground-image: -moz-linear-gradient(red, black);\n\tbackground-image: -o-linear-gradient(red, black);\n\tbackground-image: linear-gradient(red, black);\n}');
	prefs.set('css.gradient.fallback', false);

	// test gradients without prefixes
	var prefixes = prefs.get('css.gradient.prefixes');
	prefs.set('css.gradient.prefixes', null);

	editorStub.replaceContent('.r{background:lg(red, black)$0}');
	emmet.require('actions').run('expand_abbreviation', editorStub);
	equal(editorStub.getContent(), '.r{background:linear-gradient(red, black);}');
	prefs.set('css.gradient.prefixes', prefixes);

	
	editorStub.setSyntax('html');
});

test('"Reflect CSS Value" action delegate', function() {
	editorStub.setSyntax('css');
	editorStub.replaceContent('.r{a:test;a:linear-gradient(red, green$0);a:-moz-linear-gradient(red, black);p:1}');
	
	emmet.require('actions').run('reflect_css_value', editorStub);
	equal(editorStub.getContent(), '.r{a:test;a:linear-gradient(red, green);a:-moz-linear-gradient(red, green);p:1}');
	editorStub.setSyntax('html');
});