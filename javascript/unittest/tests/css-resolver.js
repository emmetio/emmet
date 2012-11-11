module('CSS resolver');
test('Vendor prefixes extraction', function() {
	var css = emmet.require('cssResolver');
	
	deepEqual(css.extractPrefixes('-transform'), {property: 'transform', prefixes: 'all'}, 'All prefixes for "transform" property');
	deepEqual(css.extractPrefixes('-w-transform'), {property: 'transform', prefixes: ['w']}, 'Webkit prefix for "transform" property');
	deepEqual(css.extractPrefixes('-wom-transform'), {property: 'transform', prefixes: ['w', 'o', 'm']}, 'Webkit, Opera and Mozilla prefix for "transform" property');
	deepEqual(css.extractPrefixes('box-sizing'), {property: 'box-sizing', prefixes: null}, 'No prefixes for "box-sizing" property');
	deepEqual(css.extractPrefixes('float'), {property: 'float', prefixes: null}, 'No prefixes for "float" property');
});

test('Value extraction', function() {
	var css = emmet.require('cssResolver');
	
	equal(css.findValuesInAbbreviation('padding10'), '10', 'Extracted value from "padding10"');
	equal(css.findValuesInAbbreviation('padding10-10'), '10-10', 'Extracted value from "padding10-10"');
	equal(css.findValuesInAbbreviation('padding-10-10'), '-10-10', 'Extracted value from "padding-10-10"');
	equal(css.findValuesInAbbreviation('padding1.5'), '1.5', 'Extracted value from "padding1.5"');
	equal(css.findValuesInAbbreviation('padding.5'), '.5', 'Extracted value from "padding.5"');
	equal(css.findValuesInAbbreviation('padding-.5'), '-.5', 'Extracted value from "padding-.5"');
	equal(css.findValuesInAbbreviation('margin-a'), 'a', 'Extracted value from "margin-a"');
	equal(css.findValuesInAbbreviation('margin-a-i'), 'a-i', 'Extracted value from "margin-a-i"');
	equal(css.findValuesInAbbreviation('margin-a-foo'), '', 'No value extracted from "margin-a-foo"');
});

test('Value parsing', function() {
	var css = emmet.require('cssResolver');
	
	deepEqual(css.parseValues('5'), ['5'], 'Parsed value "5"');
	deepEqual(css.parseValues('10'), ['10'], 'Parsed value "10"');
	deepEqual(css.parseValues('10-10'), ['10', '10'], 'Parsed value "10-10"');
	deepEqual(css.parseValues('10em10px'), ['10em', '10px'], 'Parsed value "10em10px"');
	deepEqual(css.parseValues('10em-10px'), ['10em', '-10px'], 'Parsed value "10em-10px"');
	deepEqual(css.parseValues('10em-10px10'), ['10em', '-10px', '10'], 'Parsed value "10em-10px10"');
	deepEqual(css.parseValues('10-10--10'), ['10', '10', '-10'], 'Parsed value "10-10--10"');
	deepEqual(css.parseValues('1.5'), ['1.5'], 'Parsed value "1.5"');
	deepEqual(css.parseValues('.5'), ['.5'], 'Parsed value ".5"');
	deepEqual(css.parseValues('-.5'), ['-.5'], 'Parsed value "-.5"');
	deepEqual(css.parseValues('1.5em-.5'), ['1.5em', '-.5'], 'Parsed value "1.5em-.5"');
	deepEqual(css.parseValues('i-5-a'), ['inherit', '5', 'auto'], 'Parsed value "inherit-5-auto"');
});

test('Value normalization', function() {
	var css = emmet.require('cssResolver');
	
	equal(css.normalizeValue('10'), '10px', 'Normalized value 10');
	equal(css.normalizeValue('10p'), '10%', 'Normalized value 10');
	equal(css.normalizeValue('1.5'), '1.5em', 'Normalized value 1.5');
	equal(css.normalizeValue('-.5'), '-.5em', 'Normalized value -.5');
	equal(css.normalizeValue('-.5p'), '-.5%', 'Normalized value -.5');
});

test('Abbreviation expanding', function() {
	var css = emmet.require('cssResolver');
	
	equal(css.expandToSnippet('p0'), 'padding: 0;', 'Expanded "p0" (no unit for zero)');
	equal(css.expandToSnippet('z1'), 'z-index: 1;', 'Expanded "z1" (unitless value)');
	equal(css.expandToSnippet('p5'), 'padding: 5px;', 'Expanded "p5"');
	equal(css.expandToSnippet('p5-6'), 'padding: 5px 6px;', 'Expanded "p5-6"');
	equal(css.expandToSnippet('padding5'), 'padding: 5px;', 'Expanded "padding5"');
	equal(css.expandToSnippet('-transform'), '-webkit-transform: ${1};\n-moz-transform: ${1};\n-ms-transform: ${1};\n-o-transform: ${1};\ntransform: ${1};', 'Expanded "-transform"');
	equal(css.expandToSnippet('-pos-a'), '-webkit-position: absolute;\n-moz-position: absolute;\n-ms-position: absolute;\n-o-position: absolute;\nposition: absolute;', 'Expanded "-pos-a"');
	equal(css.expandToSnippet('pos-a'), 'position: absolute;', 'Expanded "pos-a" (no processing)');
	equal(css.expandToSnippet('something'), 'something: ${1};', 'Expanded unknown property');
	equal(css.expandToSnippet('-bxsh'), '-webkit-box-shadow: ${1:hoff} ${2:voff} ${3:radius} ${4:color};\n-moz-box-shadow: ${1:hoff} ${2:voff} ${3:radius} ${4:color};\nbox-shadow: ${1:hoff} ${2:voff} ${3:radius} ${4:color};', 'Expanded property with multiple tabstops');
});

test('!important declaration', function() {
	var css = emmet.require('cssResolver');
	
	equal(css.expandToSnippet('pos-a!'), 'position: absolute !important;', 'Expanded "pos-a" with !important');
	equal(css.expandToSnippet('padding5!'), 'padding: 5px !important;', 'Expanded "padding5" with !important');
	equal(css.expandToSnippet('-transform!'), '-webkit-transform: ${1} !important;\n-moz-transform: ${1} !important;\n-ms-transform: ${1} !important;\n-o-transform: ${1} !important;\ntransform: ${1} !important;', 'Expanded "-transform" with !important');
});

test('Stylus dialect', function() {
	var css = emmet.require('cssResolver');
	equal(css.expandToSnippet('p0', 'stylus'), 'padding 0');
	equal(css.expandToSnippet('pos-a!', 'stylus'), 'position absolute !important');
	equal(css.expandToSnippet('padding5!', 'stylus'), 'padding 5px !important');
	equal(css.expandToSnippet('-transform!', 'stylus'), '-webkit-transform ${1} !important\n-moz-transform ${1} !important\n-ms-transform ${1} !important\n-o-transform ${1} !important\ntransform ${1} !important');
});

test('Expand Abbreviation action handler', function() {
	editorStub.setSyntax('css');
	
	var actions = emmet.require('actions');
	var run = function(name) {
		actions.run(name, editorStub);
	};
	
	editorStub.replaceContent('p${0}');
	run('expand_abbreviation');
	equal(editorStub.getContent(), 'padding: ;', 'Expanded "p"');
	
	editorStub.replaceContent('p0${0}');
	run('expand_abbreviation');
	equal(editorStub.getContent(), 'padding: 0;', 'Expanded "p0"');
	
	editorStub.replaceContent('p1.2${0}');
	run('expand_abbreviation');
	equal(editorStub.getContent(), 'padding: 1.2em;', 'Expanded "p1.2"');
	
	editorStub.replaceContent('margin: 0 !${0};');
	run('expand_abbreviation');
	equal(editorStub.getContent(), 'margin: 0 !important;', 'Added !important modifier');
	
	editorStub.setSyntax('html');
});