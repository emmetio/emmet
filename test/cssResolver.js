var assert = require('assert');
var editor = require('./stubs/editor');
var action = require('../lib/action/expandAbbreviation');
var prefs = require('../lib/assets/preferences');
var resolver = require('../lib/resolver/css');

describe('CSS Resolver', function() {
	var _ciuEnabled = null;
	function restoreCIU() {
		prefs.set('caniuse.enabled', _ciuEnabled);
	}

	function disableCIU() {
		_ciuEnabled = prefs.get('caniuse.enabled');
		prefs.set('caniuse.enabled', false);
	}

	it('should extract prefixes', function () {
		assert.deepEqual(resolver.extractPrefixes('-transform'), {property: 'transform', prefixes: 'all'}, 'All prefixes for "transform" property');
		assert.deepEqual(resolver.extractPrefixes('-w-transform'), {property: 'transform', prefixes: ['w']}, 'Webkit prefix for "transform" property');
		assert.deepEqual(resolver.extractPrefixes('-wom-transform'), {property: 'transform', prefixes: ['w', 'o', 'm']}, 'Webkit, Opera and Mozilla prefix for "transform" property');
		assert.deepEqual(resolver.extractPrefixes('box-sizing'), {property: 'box-sizing', prefixes: null}, 'No prefixes for "box-sizing" property');
		assert.deepEqual(resolver.extractPrefixes('float'), {property: 'float', prefixes: null}, 'No prefixes for "float" property');
	});

	it('should extract values', function() {
		assert.equal(resolver.findValuesInAbbreviation('trs-all'), 'all', 'Extracted value from "trs-all"');
		assert.equal(resolver.findValuesInAbbreviation('padding10'), '10', 'Extracted value from "padding10"');
		assert.equal(resolver.findValuesInAbbreviation('padding10-10'), '10-10', 'Extracted value from "padding10-10"');
		assert.equal(resolver.findValuesInAbbreviation('padding-10-10'), '-10-10', 'Extracted value from "padding-10-10"');
		assert.equal(resolver.findValuesInAbbreviation('padding1.5'), '1.5', 'Extracted value from "padding1.5"');
		assert.equal(resolver.findValuesInAbbreviation('padding.5'), '.5', 'Extracted value from "padding.5"');
		assert.equal(resolver.findValuesInAbbreviation('padding-.5'), '-.5', 'Extracted value from "padding-.5"');
		assert.equal(resolver.findValuesInAbbreviation('margin-a'), 'a', 'Extracted value from "margin-a"');
		assert.equal(resolver.findValuesInAbbreviation('margin-a-i'), 'a-i', 'Extracted value from "margin-a-i"');
		assert.equal(resolver.findValuesInAbbreviation('margin-a-foo'), '', 'No value extracted from "margin-a-foo"');
		assert.equal(resolver.findValuesInAbbreviation('c#333'), '#333', 'Extracted #333');
		assert.equal(resolver.findValuesInAbbreviation('mr$size'), '$size', 'Extracted $size');
	});

	it('should parse values', function() {
		assert.deepEqual(resolver.parseValues('#0#333'), ['#000', '#333'], 'Parsed value "#0#333"');
		assert.deepEqual(resolver.parseValues('5'), ['5'], 'Parsed value "5"');
		assert.deepEqual(resolver.parseValues('10'), ['10'], 'Parsed value "10"');
		assert.deepEqual(resolver.parseValues('10-10'), ['10', '10'], 'Parsed value "10-10"');
		assert.deepEqual(resolver.parseValues('10em10px'), ['10em', '10px'], 'Parsed value "10em10px"');
		assert.deepEqual(resolver.parseValues('10em-10px'), ['10em', '-10px'], 'Parsed value "10em-10px"');
		assert.deepEqual(resolver.parseValues('10em-10px10'), ['10em', '-10px', '10'], 'Parsed value "10em-10px10"');
		assert.deepEqual(resolver.parseValues('10-10--10'), ['10', '10', '-10'], 'Parsed value "10-10--10"');
		assert.deepEqual(resolver.parseValues('1.5'), ['1.5'], 'Parsed value "1.5"');
		assert.deepEqual(resolver.parseValues('.5'), ['.5'], 'Parsed value ".5"');
		assert.deepEqual(resolver.parseValues('-.5'), ['-.5'], 'Parsed value "-.5"');
		assert.deepEqual(resolver.parseValues('1.5em-.5'), ['1.5em', '-.5'], 'Parsed value "1.5em-.5"');
		assert.deepEqual(resolver.parseValues('i-5-a'), ['inherit', '5', 'auto'], 'Parsed value "inherit-5-auto"');
		assert.deepEqual(resolver.parseValues('$a$b'), ['\\$a', '\\$b']);
	});

	it('should normalize values', function() {
		disableCIU();
		
		assert.equal(resolver.expandToSnippet('p0'), 'padding: 0;', 'Expanded "p0" (no unit for zero)');
		assert.equal(resolver.expandToSnippet('z1'), 'z-index: 1;', 'Expanded "z1" (unitless value)');
		assert.equal(resolver.expandToSnippet('p5'), 'padding: 5px;', 'Expanded "p5"');
		assert.equal(resolver.expandToSnippet('p5-6'), 'padding: 5px 6px;', 'Expanded "p5-6"');
		assert.equal(resolver.expandToSnippet('padding5'), 'padding: 5px;', 'Expanded "padding5"');
		assert.equal(resolver.expandToSnippet('-transform'), '-webkit-transform: ${1};\n-moz-transform: ${1};\n-ms-transform: ${1};\n-o-transform: ${1};\ntransform: ${1};', 'Expanded "-transform"');
		assert.equal(resolver.expandToSnippet('-pos-a'), '-webkit-position: absolute;\n-moz-position: absolute;\n-ms-position: absolute;\n-o-position: absolute;\nposition: absolute;', 'Expanded "-pos-a"');
		assert.equal(resolver.expandToSnippet('pos-a'), 'position: absolute;', 'Expanded "pos-a" (no processing)');
		assert.equal(resolver.expandToSnippet('something'), 'something: ${1};', 'Expanded unknown property');
		assert.equal(resolver.expandToSnippet('-bxsh'), '-webkit-box-shadow: ${1:inset }${2:hoff} ${3:voff} ${4:blur} ${5:color};\n-moz-box-shadow: ${1:inset }${2:hoff} ${3:voff} ${4:blur} ${5:color};\nbox-shadow: ${1:inset }${2:hoff} ${3:voff} ${4:blur} ${5:color};', 'Expanded property with multiple tabstops');
		assert.equal(resolver.expandToSnippet('bd1#0solid'), 'border: 1px #000 solid;', 'Expanded "bd1#0solid"');
		assert.equal(resolver.expandToSnippet('bd1-s-blue'), 'border: 1px solid blue;', 'Expanded "bd1-s-blue"');
		assert.equal(resolver.expandToSnippet('bdt2-s#ED'), 'border-top: 2px solid #EDEDED;', 'Expanded "bdt2-s#ED" (color uppercase)');
		assert.equal(resolver.expandToSnippet('p10%'), 'padding: 10%;', 'Expanded "p10%"');

		restoreCIU();
	});

	it('should correctly expand colors', function() {
		assert.equal(resolver.expandToSnippet('c#3d3d3d'), 'color: #3d3d3d;', 'Expanded "c#3d3d3d"');
		assert.equal(resolver.expandToSnippet('c#d3d3d3'), 'color: #d3d3d3;', 'Expanded "c#d3d3d3"');
		assert.equal(resolver.expandToSnippet('c#'), 'color: #000;', 'Expanded "c#"');
		assert.equal(resolver.expandToSnippet('c#t'), 'color: transparent;', 'Expanded "c#t"');
		assert.equal(resolver.expandToSnippet('c#f.5'), 'color: rgba(255, 255, 255, 0.5);');
		assert.equal(resolver.expandToSnippet('c#fc0.333'), 'color: rgba(255, 204, 0, 0.333);');
	});

	it('should augument values with !important', function() {
		disableCIU();
		
		assert.equal(resolver.expandToSnippet('pos-a!'), 'position: absolute !important;', 'Expanded "pos-a" with !important');
		assert.equal(resolver.expandToSnippet('padding5!'), 'padding: 5px !important;', 'Expanded "padding5" with !important');
		assert.equal(resolver.expandToSnippet('-transform!'), '-webkit-transform: ${1} !important;\n-moz-transform: ${1} !important;\n-ms-transform: ${1} !important;\n-o-transform: ${1} !important;\ntransform: ${1} !important;', 'Expanded "-transform" with !important');

		restoreCIU();
	});

	it('should work with Stylus dialect', function() {
		disableCIU();

		assert.equal(resolver.expandToSnippet('p0', 'stylus'), 'padding 0');
		assert.equal(resolver.expandToSnippet('pos-a!', 'stylus'), 'position absolute !important');
		assert.equal(resolver.expandToSnippet('padding5!', 'stylus'), 'padding 5px !important');
		assert.equal(resolver.expandToSnippet('-transform!', 'stylus'), '-webkit-transform ${1} !important\n-moz-transform ${1} !important\n-ms-transform ${1} !important\n-o-transform ${1} !important\ntransform ${1} !important');

		restoreCIU();
	});

	it('should produce values with vendor-prefixed variants', function() {
		assert.equal(resolver.expandToSnippet('df'), 'display: -webkit-flex;\ndisplay: -moz-flex;\ndisplay: -ms-flex;\ndisplay: -o-flex;\ndisplay: flex;');
	});

	it('should NOT produce vendor-prefixed properties for preprocessors', function() {
		assert.equal(resolver.expandToSnippet('trf', 'less'), 'transform: ${0};');
		assert.equal(resolver.expandToSnippet('trf', 'sass'), 'transform: ${0}');
		assert.equal(resolver.expandToSnippet('trf', 'sass'), 'transform: ${0}');
	});

	it('should be available in Expand Abbreviation action', function() {
		var run = function(content) {
			if (content) {
				editor.replaceContent(content);
			}
			action.expandAbbreviationAction(editor);
		};

		editor.setSyntax('css');
		
		run('p${0}');
		assert.equal(editor.getContent(), 'padding: ;', 'Expanded "p"');
		
		run('p0${0}');
		assert.equal(editor.getContent(), 'padding: 0;', 'Expanded "p0"');
		
		run('p1.2${0}');
		assert.equal(editor.getContent(), 'padding: 1.2em;', 'Expanded "p1.2"');

		run('m$s1$s2');
		assert.equal(editor.getContent(), 'margin: $s1 $s2;', 'Expanded "m$s1$s2"');
		
		run('margin: 0 !${0};');
		assert.equal(editor.getContent(), 'margin: 0 !important;', 'Added !important modifier');

		// NB: CSS resolver uses Can I Use database here
		run('trs-all0.25s${0}');
		assert.equal(editor.getContent(), '-webkit-transition: all 0.25s;\n-o-transition: all 0.25s;\ntransition: all 0.25s;');

		run('bdrs10${0}');
		assert.equal(editor.getContent(), 'border-radius: 10px;');

		run('ul {\n\t// comment?\n\tp10${0}\n}');
		assert.equal(editor.getContent(), 'ul {\n\t// comment?\n\tpadding: 10px;\n}', 'Expanded abbreviation inside rule with inline SCSS comment');

		// no vendor prefixes for preprocessors
		editor.setSyntax('less');
		run('trf${0};');
		assert.equal(editor.getContent(), 'transform: ;');

		editor.setSyntax('scss');
		run('trf${0};');
		assert.equal(editor.getContent(), 'transform: ;');

		editor.setSyntax('css');
		run('trf${0};');
		assert.equal(editor.getContent(), '-webkit-transform: ;\n-ms-transform: ;\n-o-transform: ;\ntransform: ;');
		
		editor.setSyntax('html');
	});

	it('should honor property separator preferences', function() {
		var run = function(content) {
			if (content) {
				editor.replaceContent(content);
			}
			action.expandAbbreviationAction(editor, 'css', 'css_line');
		};

		run('p+m${0}');
		assert.equal(editor.getContent(), 'padding: ;margin: ;');
		
		run('p0+m10${0}');
		assert.equal(editor.getContent(), 'padding: 0;margin: 10px;');

		run('p0+@f${0}');
		assert.equal(editor.getContent(), 'padding: 0;@font-face {\n\tfont-family:;\n\tsrc:url();\n}');
	});
});