var assert = require('assert');
var editor = require('./stubs/editor');
var cssGradient = require('../lib/resolver/cssGradient');
var prefs = require('../lib/assets/preferences');
var expandAbbreviation = require('../lib/action/expandAbbreviation');
var reflectValue = require('../lib/action/reflectCSSValue');

describe('CSS Gradient', function() {
	it('should parse linear gradient', function() {
		var gradient = cssGradient.parse('linear-gradient(top   left, white , #a6f2c0 30%, rgba(180, 200, 210, .9) .8, black 10em)');
	
		assert.equal(gradient.type, 'linear', 'Gradient is linear');
		assert.equal(gradient.direction, 'top left', 'Direction is "top left"');
		assert.equal(gradient.colorStops.length, 4, '4 color stops');
		
		gradient = cssGradient.parse('-webkit-linear-gradient(red, black)');
		assert.ok(gradient, 'Parsed vendor-prefixed gradient');
	});

	it('should expand abbreviation as "Expand Abbreviation" handler', function() {
		var run = function(content) {
			if (content) {
				editor.replaceContent(content);
			}
			expandAbbreviation.expandAbbreviationAction(editor);
		};

		editor.setSyntax('css');

		run('.r{background:lg(red, black)$0}');
		assert.equal(editor.getContent(), '.r{background:-webkit-gradient(linear, 0 0, 0 100%, from(red), to(black));background:-webkit-linear-gradient(red, black);background:-moz-linear-gradient(red, black);background:-o-linear-gradient(red, black);background:linear-gradient(red, black);}');
		assert.equal(editor.getCaretPos(), 245, 'Correctly placed cursor');
		
		// expand gradient outside value
		run('.r{\n\tlg(red, black)$0\n}');
		assert.equal(editor.getContent(), '.r{\n\tbackground-image: -webkit-gradient(linear, 0 0, 0 100%, from(red), to(black));\n\tbackground-image: -webkit-linear-gradient(red, black);\n\tbackground-image: -moz-linear-gradient(red, black);\n\tbackground-image: -o-linear-gradient(red, black);\n\tbackground-image: linear-gradient(red, black);\n}');
		
		// test fallback value
		prefs.set('css.gradient.fallback', true);
		run('.r{\n\tlg(red, black)$0\n}');
		assert.equal(editor.getContent(), '.r{\n\tbackground-color: red;\n\tbackground-image: -webkit-gradient(linear, 0 0, 0 100%, from(red), to(black));\n\tbackground-image: -webkit-linear-gradient(red, black);\n\tbackground-image: -moz-linear-gradient(red, black);\n\tbackground-image: -o-linear-gradient(red, black);\n\tbackground-image: linear-gradient(red, black);\n}');
		prefs.set('css.gradient.fallback', false);

		// test gradients without prefixes
		var prefixes = prefs.get('css.gradient.prefixes');
		prefs.set('css.gradient.prefixes', null);

		run('.r{background:lg(red, black)$0}');
		assert.equal(editor.getContent(), '.r{background:linear-gradient(red, black);}');
		prefs.set('css.gradient.prefixes', prefixes);
		
		editor.setSyntax('html');
	});

	it('should run as "Reflect CSS Value" action delegate', function() {
		editor.setSyntax('css');
		editor.replaceContent('.r{a:test;a:linear-gradient(red, green$0);a:-moz-linear-gradient(red, black);p:1}');
		
		reflectValue.reflectCSSValueAction(editor);
		assert.equal(editor.getContent(), '.r{a:test;a:linear-gradient(red, green);a:-moz-linear-gradient(red, green);p:1}');
		editor.setSyntax('html');
	});
});
