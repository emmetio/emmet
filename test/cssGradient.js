var assert = require('assert');
var editor = require('./stubs/editor');
var cssGradient = require('../lib/resolver/cssGradient');
var prefs = require('../lib/assets/preferences');
var expandAbbreviation = require('../lib/action/expandAbbreviation');
var reflectValue = require('../lib/action/reflectCSSValue');
var gradient = require('../lib/resolver/gradient/linear');

describe('CSS Gradient', function() {
	it.only('should parse linear gradient', function() {
		var g = gradient.parse('linear-gradient(top   left, white , #a6f2c0 30%, rgba(180, 200, 210, .9) .8, black 10em)');
		assert.equal(g.type, 'linear-gradient');
		assert.equal(g.direction, 135);
		assert.equal(g.colorStops.length, 4);
		assert.equal(g.stringify(), 'linear-gradient(to bottom right, white, #a6f2c0 30%, rgba(180, 200, 210, .9) .8, black 10em)');
		assert.equal(g.stringify({prefix: 'moz'}), '-moz-linear-gradient(top left, white, #a6f2c0 30%, rgba(180, 200, 210, .9) .8, black 10em)');

		// test old Webkit syntax
		g = gradient.parse('lg(red, black)');
		assert.equal(g.stringifyOldWebkit(), '-webkit-gradient(linear, 0 0, 0 100%, from(red), to(black))');
		
		g = gradient.parse('-webkit-linear-gradient(red, black)');
		assert.equal(g.direction, 0);
		assert.equal(g.colorStops.length, 2);
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

	// it.only('should parse multiple gradients', function() {
	// 	editor.setSyntax('css');

	// 	console.log(cssGradient.gradientsFromCSSProperty('a{b: lg(red, black), lg(yellow, white)}', 10));

	// 	// run('.r{background:lg(red, black)$0}');
	// 	// assert.equal(editor.getContent(), '.r{background:-webkit-gradient(linear, 0 0, 0 100%, from(red), to(black));background:-webkit-linear-gradient(red, black);background:-moz-linear-gradient(red, black);background:-o-linear-gradient(red, black);background:linear-gradient(red, black);}');
		
	// 	editor.setSyntax('html');
	// });
});
