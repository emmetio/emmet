module('CSS Edit Tree');
test('Check internals', function() {
	var source = 'a{b:c;}';
	/** @type EditContainer */
	var rule = emmet.require('cssEditTree').parse(source);
	
	equal(rule.nameRange().start, 0, 'Selector position of "' + source + '"');
	equal(rule._positions.contentStart, 2, 'Content position of "' + source + '"');
	
	var property = rule.get(0);
	equal(property.namePosition(), 2, 'Name position of property "' + property.name() + '"');
	equal(property.valuePosition(), 4, 'Value position of property "' + property.name() + '"');
	
	equal(rule.value('b'), 'c', 'Value of property "' + property.name() + '"');
	equal(rule.indexOf('b'), 0, 'Index of property "' + property.name() + '"');
	equal(rule.name(), 'a', 'Getting selector value');
	
	rule.add('d', 'e');
	var prop = rule.itemFromPosition(7);
	equal(prop.name(), 'd', 'Got property from position');
	
	rule.add('t', '123', 0);
});

test('Check modifications', function() {
	var source = 'a{c:d;}';
	/** @type CSSRule */
	var rule = emmet.require('cssEditTree').parse(source);
	
	rule.value('c', 'abc');
	equal(rule.value('c'), 'abc', 'New value');
	equal(rule.source, 'a{c:abc;}', 'New source');
	deepEqual(rule.get('c').valueRange(true).toArray(), [4, 7], 'Proper value range');
	
	rule.add('e', 'hello');
	equal(rule.value('e'), 'hello', 'New property');
	equal(rule.source, 'a{c:abc;e:hello;}', 'Source with new property');
	
	rule.remove('c');
	equal(rule.source, 'a{e:hello;}', 'Source with removed property');
});

test('Check semicolor auto-insertion', function() {
	var source = 'a{f:g}';
	/** @type CSSRule */
	var rule = emmet.require('cssEditTree').parse(source);
	
	rule.add('h', 'hello');
	equal(rule.source, 'a{f:g;h:hello;}', 'Source with auto-inserted semi-colon');
});

test('Check source with formatting', function() {
	var source = 'img {\n\tborder: 1px solid red !important; /* comment */\n\tfont: "arial", sans-serif;\n}';
	/** @type CSSRule */
	var rule = emmet.require('cssEditTree').parse(source);
	
	rule.add('color', 'red');
	equal(rule.source, 'img {\n\tborder: 1px solid red !important; /* comment */\n\tfont: "arial", sans-serif;\n\tcolor: red;\n}', 'Source with formatting 1');
	
	/** @type CSSRule */
	var rule2 = emmet.require('cssEditTree').parse('.a {\n\tcolor: black;\n\t}');
	rule2.add('font', 'bold');
	equal(rule2.source, '.a {\n\tcolor: black;\n\tfont: bold;\n\t}', 'Source with formatting 2');
	
	/** @type CSSRule */
	var rule3 = emmet.require('cssEditTree').parse('a {\n\tb: c;\n\t/* c */\n\td: e;\n}');
	rule3.add('f', 'g', 1);
	equal(rule3.source, 'a {\n\tb: c;\n\t/* c */\n\tf: g;\n\td: e;\n}', 'Source with formatting 3');
	
	rule3.add('h', 'i');
	equal(rule3.source, 'a {\n\tb: c;\n\t/* c */\n\tf: g;\n\td: e;\n\th: i;\n}', 'Source with formatting 4');
});

test('Check value parts', function() {
	var source = '.a {b:hello "lorem ipsum",     func(lorem ipsum) 123 ""; c: fn1(a), fn2(fn3(b))}';
	/** @type EditContainer */
	var rule = emmet.require('cssEditTree').parse(source);
	
	var prop = rule.get('b');
	var parts = _.map(prop.valueParts(), function(r) {
		return r.substring(prop.value());
	});
	
	deepEqual(parts, ['hello', '"lorem ipsum"', 'func(lorem ipsum)', '123', '""'], 'Correctly splitted complex value');
	
	prop.value('1px');
	var parts = _.map(prop.valueParts(), function(r) {
		return r.substring(prop.value());
	});
	
	deepEqual(parts, ['1px'], 'No need to split simple value');
	
	prop = rule.get('c');
	parts = _.map(prop.valueParts(), function(r) {
		return r.substring(prop.value());
	});
	
	deepEqual(parts, ['fn1(a)', 'fn2(fn3(b))'], 'Correctly splitted complex value with nested functions');
});

test('Check CSS Parser', function() {
	var source = 'a{b\nc:d;}';
	/** @type EditContainer */
	var rule = emmet.require('cssEditTree').parse(source);
	equal(rule.get(0).name(), 'c', 'Correctly parsed invalid CSS rule');

});