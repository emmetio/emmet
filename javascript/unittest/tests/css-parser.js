module('CSS Edit Tree');
test('Check internals', function() {
	var source = 'a{b:c;}';
	/** @type CSSRule */
	var rule = zen_coding.require('cssEditTree').parse(source);
	
	equal(rule._selectorPos, 0, 'Selector position of "' + source + '"');
	equal(rule._contentStartPos, 2, 'Content position of "' + source + '"');
	
	var property = rule.get(0);
	equal(property.namePosition(), 2, 'Name position of property "' + property.name() + '"');
	equal(property.valuePosition(), 4, 'Value position of property "' + property.name() + '"');
	
	equal(rule.value('b'), 'c', 'Value of property "' + property.name() + '"');
	equal(rule.indexOf('b'), 0, 'Index of property "' + property.name() + '"');
	equal(rule.selector(), 'a', 'Getting selector value');
	
	rule.add('d', 'e');
	var prop = rule.propertyFromPosition(7);
	equal(prop.name(), 'd', 'Got ptoperty from position');
});

test('Check modifications', function() {
	var source = 'a{c:d;}';
	/** @type CSSRule */
	var rule = zen_coding.require('cssEditTree').parse(source);
	
	rule.set('c', 'abc');
	equal(rule.value('c'), 'abc', 'New value');
	equal(rule.source, 'a{c:abc;}', 'New source');
	
	rule.add('e', 'hello');
	equal(rule.value('e'), 'hello', 'New property');
	equal(rule.source, 'a{c:abc;e:hello;}', 'Source with new property');
	
	rule.remove('c');
	equal(rule.source, 'a{e:hello;}', 'Source with removed property');
});

test('Check semicolor auto-insertion', function() {
	var source = 'a{f:g}';
	/** @type CSSRule */
	var rule = zen_coding.require('cssEditTree').parse(source);
	
	rule.add('h', 'hello');
	equal(rule.source, 'a{f:g;h:hello;}', 'Source with auto-inserted semi-colon');
});

test('Check source with formatting', function() {
	var source = 'img {\n\tborder: 1px solid red !important; /* comment */\n\tfont: "arial", sans-serif;\n}';
	/** @type CSSRule */
	var rule = zen_coding.require('cssEditTree').parse(source);
	
	rule.add('color', 'red');
	equal(rule.source, 'img {\n\tborder: 1px solid red !important; /* comment */\n\tfont: "arial", sans-serif;\n\tcolor: red;\n}', 'Source with formatting 1');
	
	/** @type CSSRule */
	var rule2 = zen_coding.require('cssEditTree').parse('.a {\n\tcolor: black;\n\t}');
	rule2.add('font', 'bold');
	equal(rule2.source, '.a {\n\tcolor: black;\n\tfont: bold;\n\t}', 'Source with formatting 2');
	
	/** @type CSSRule */
	var rule3 = zen_coding.require('cssEditTree').parse('a {\n\tb: c;\n\t/* c */\n\td: e;\n}');
	rule3.add('f', 'g', 1);
	equal(rule3.source, 'a {\n\tb: c;\n\t/* c */\n\tf: g;\n\td: e;\n}', 'Source with formatting 3');
	
	rule3.add('h', 'i');
	equal(rule3.source, 'a {\n\tb: c;\n\t/* c */\n\tf: g;\n\td: e;\n\th: i;\n}', 'Source with formatting 4');
});