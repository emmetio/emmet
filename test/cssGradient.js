var assert = require('assert');
var editor = require('./stubs/editor');
var cssGradient = require('../lib/resolver/cssGradient');
var prefs = require('../lib/assets/preferences');
var ciu = require('../lib/assets/caniuse');
var expandAbbreviation = require('../lib/action/expandAbbreviation');
var reflectValue = require('../lib/action/reflectCSSValue');
var gradient = require('../lib/resolver/gradient/linear');

describe('CSS Gradient', function() {
	var _ciuEnabled = null;
	function restoreCIU() {
		prefs.set('caniuse.enabled', _ciuEnabled);
	}

	function disableCIU() {
		_ciuEnabled = prefs.get('caniuse.enabled');
		prefs.set('caniuse.enabled', false);
	}

	it('should parse linear gradient', function() {
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
		assert.equal(g.direction, 180);
		assert.equal(g.colorStops.length, 2);
	});

	it('should expand abbreviation as "Expand Abbreviation" handler', function() {
		disableCIU();
		var run = function(content) {
			if (content) {
				editor.replaceContent(content);
			}
			expandAbbreviation.expandAbbreviationAction(editor);
		};

		editor.setSyntax('css');

		run('.r{\n\tlg(right, red, black)$0\n}');
		assert.equal(editor.getContent(), '.r{\n\tbackground-image: -webkit-linear-gradient(right, red, black);\n\tbackground-image: -moz-linear-gradient(right, red, black);\n\tbackground-image: -o-linear-gradient(right, red, black);\n\tbackground-image: linear-gradient(to left, red, black);\n}');

		run('.r{background:lg(red, black)$0}');
		assert.equal(editor.getContent(), '.r{background:-webkit-linear-gradient(red, black);background:-moz-linear-gradient(red, black);background:-o-linear-gradient(red, black);background:linear-gradient(red, black);}');
		assert.equal(editor.getCaretPos(), 174);
		
		// expand gradient outside value
		run('.r{\n\tlg(red, black)$0\n}');
		assert.equal(editor.getContent(), '.r{\n\tbackground-image: -webkit-linear-gradient(red, black);\n\tbackground-image: -moz-linear-gradient(red, black);\n\tbackground-image: -o-linear-gradient(red, black);\n\tbackground-image: linear-gradient(red, black);\n}');

		// test fallback value
		prefs.set('css.gradient.fallback', true);
		run('.r{\n\tlg(red, black)$0\n}');
		assert.equal(editor.getContent(), '.r{\n\tbackground-color: red;\n\tbackground-image: -webkit-linear-gradient(red, black);\n\tbackground-image: -moz-linear-gradient(red, black);\n\tbackground-image: -o-linear-gradient(red, black);\n\tbackground-image: linear-gradient(red, black);\n}');
		prefs.set('css.gradient.fallback', false);

		// test gradients without prefixes
		var prefixes = prefs.get('css.gradient.prefixes');
		prefs.set('css.gradient.prefixes', null);

		run('.r{background:lg(red, black)$0}');
		assert.equal(editor.getContent(), '.r{background:linear-gradient(red, black);}');
		prefs.set('css.gradient.prefixes', prefixes);
		
		editor.setSyntax('html');
		restoreCIU();
	});

	it('should run as "Reflect CSS Value" action delegate', function() {
		editor.setSyntax('css');
		editor.replaceContent('.r{a:test;a:linear-gradient(red, green$0);a:-moz-linear-gradient(red, black);p:1}');
		
		reflectValue.reflectCSSValueAction(editor);
		assert.equal(editor.getContent(), '.r{a:test;a:linear-gradient(red, green);a:-moz-linear-gradient(red, green);p:1}');
		editor.setSyntax('html');
	});

	it('should parse multiple gradients', function() {
		editor.setSyntax('css');
		disableCIU();

		var run = function(content) {
			if (content) {
				editor.replaceContent(content);
			}
			expandAbbreviation.expandAbbreviationAction(editor);
		};

		run('.r{background:lg(red, black), lg(yellow, blue)$0}');
		assert.equal(editor.getContent(), '.r{background:-webkit-linear-gradient(red, black), -webkit-linear-gradient(yellow, blue);background:-moz-linear-gradient(red, black), -moz-linear-gradient(yellow, blue);background:-o-linear-gradient(red, black), -o-linear-gradient(yellow, blue);background:linear-gradient(red, black), linear-gradient(yellow, blue);}');
		assert.equal(editor.getCaretPos(), 314);

		run('.r{background:lg(red, black), skip, lg(yellow, blue)$0}');
		assert.equal(editor.getContent(), '.r{background:-webkit-linear-gradient(red, black), skip, -webkit-linear-gradient(yellow, blue);background:-moz-linear-gradient(red, black), skip, -moz-linear-gradient(yellow, blue);background:-o-linear-gradient(red, black), skip, -o-linear-gradient(yellow, blue);background:linear-gradient(red, black), skip, linear-gradient(yellow, blue);}');
		assert.equal(editor.getCaretPos(), 338);

		// reflect CSS value
		editor.replaceContent('.r{a:test;a:linear-gradient(red, green$0), skip, linear-gradient(yellow, blue);a:-moz-linear-gradient(red, black);p:1}');
		reflectValue.reflectCSSValueAction(editor);
		assert.equal(editor.getContent(), '.r{a:test;a:linear-gradient(red, green), skip, linear-gradient(yellow, blue);a:-moz-linear-gradient(red, green), skip, -moz-linear-gradient(yellow, blue);p:1}');

		restoreCIU();
		editor.setSyntax('html');
	});

	it('should not expand mixins', function() {
		// https://github.com/sergeche/emmet-sublime/issues/411
		editor.setSyntax('stylus');

		var run = function(content) {
			if (content) {
				editor.replaceContent(content);
			}
			expandAbbreviation.expandAbbreviationAction(editor);
		};

		run('.r{\n\theight: 10px$0\n\tlg(red, black)\n}');
		assert.equal(editor.getContent(), '.r{\n\theight: 10px\n\tlg(red, black)\n}');

		editor.setSyntax('html');
	});
});
