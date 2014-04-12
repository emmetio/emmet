var assert = require('assert');
var editTree = require('../../lib/editTree/css');

describe('CSS Edit Tree', function() {

	it('checking internals', function() {
		var rule = editTree.parse('a{b:c;}');
		
		assert.equal(rule.nameRange().start, 0, 'Selector position');
		assert.equal(rule._positions.contentStart, 2, 'Content position');
		
		var property = rule.get(0);
		assert.equal(property.namePosition(), 2, 'Name position of property "' + property.name() + '"');
		assert.equal(property.valuePosition(), 4, 'Value position of property "' + property.name() + '"');
		
		assert.equal(rule.value('b'), 'c', 'Value of property "' + property.name() + '"');
		assert.equal(rule.indexOf('b'), 0, 'Index of property "' + property.name() + '"');
		assert.equal(rule.name(), 'a', 'Getting selector value');
		
		rule.add('d', 'e');
		var prop = rule.itemFromPosition(7);
		assert.equal(prop.name(), 'd', 'Got property from position');
		
		rule.add('t', '123', 0);
	});

	it('checking modifications', function() {
		var rule = editTree.parse('a{c:d;}');
		
		rule.value('c', 'abc');
		assert.equal(rule.value('c'), 'abc', 'New value');
		assert.equal(rule.source, 'a{c:abc;}', 'New source');
		assert.deepEqual(rule.get('c').valueRange(true).toArray(), [4, 7], 'Proper value range');
		
		rule.add('e', 'hello');
		assert.equal(rule.value('e'), 'hello', 'New property');
		assert.equal(rule.source, 'a{c:abc;e:hello;}', 'Source with new property');
		
		rule.remove('c');
		assert.equal(rule.source, 'a{e:hello;}', 'Source with removed property');
	});

	it('checking semicolor auto-insertion', function() {
		var rule = editTree.parse('a{f:g}');
		
		rule.add('h', 'hello');
		assert.equal(rule.source, 'a{f:g;h:hello;}', 'Source with auto-inserted semi-colon');
	});

	it('checking source with formatting', function() {
		var rule = editTree.parse('img {\n\tborder: 1px solid red !important; /* comment */\n\tfont: "arial", sans-serif;\n}');
		
		rule.add('color', 'red');
		assert.equal(rule.source, 'img {\n\tborder: 1px solid red !important; /* comment */\n\tfont: "arial", sans-serif;\n\tcolor: red;\n}', 'Source with formatting 1');
		
		var rule2 = editTree.parse('.a {\n\tcolor: black;\n\t}');
		rule2.add('font', 'bold');
		assert.equal(rule2.source, '.a {\n\tcolor: black;\n\tfont: bold;\n\t}', 'Source with formatting 2');
		
		var rule3 = editTree.parse('a {\n\tb: c;\n\t/* c */\n\td: e;\n}');
		rule3.add('f', 'g', 1);
		assert.equal(rule3.source, 'a {\n\tb: c;\n\t/* c */\n\tf: g;\n\td: e;\n}', 'Source with formatting 3');
		
		rule3.add('h', 'i');
		assert.equal(rule3.source, 'a {\n\tb: c;\n\t/* c */\n\tf: g;\n\td: e;\n\th: i;\n}', 'Source with formatting 4');
	});

	it('checking value parts', function() {
		var rule = editTree.parse('.a {b:hello "lorem ipsum",     func(lorem ipsum) 123 ""; c: fn1(a), fn2(fn3(b))}');
		
		var prop = rule.get('b');
		var parts = prop.valueParts().map(function(r) {
			return r.substring(prop.value());
		});
		
		assert.deepEqual(parts, ['hello', '"lorem ipsum"', 'func(lorem ipsum)', '123', '""'], 'Correctly splitted complex value');
		
		prop.value('1px');
		var parts = prop.valueParts().map(function(r) {
			return r.substring(prop.value());
		});
		
		assert.deepEqual(parts, ['1px'], 'No need to split simple value');
		
		prop = rule.get('c');
		parts = prop.valueParts().map(function(r) {
			return r.substring(prop.value());
		});
		
		assert.deepEqual(parts, ['fn1(a)', 'fn2(fn3(b))'], 'Correctly splitted complex value with nested functions');
	});

	it('should work with incomplete rules', function() {
		// without colon
		var rule = editTree.parse('a{b\nc:d;}');
		assert.equal(rule.get(0).name(), 'b');
		assert.equal(rule.get(1).name(), 'c');

		rule.get(0).value('test');
		assert.equal(rule.source, 'a{b:test;\nc:d;}');

		// with colon
		rule = editTree.parse('a{b:\nc:d;}');
		assert.equal(rule.get(0).name(), 'b');
		assert.equal(rule.get(1).name(), 'c');

		rule.get(0).value('test');
		assert.equal(rule.source, 'a{b:test;\nc:d;}');
	});

	it('should work with nesting', function() {
		var rule = editTree.parse('a{b:c; d{e:f} g:h }');
		assert.equal(rule.get(0).name(), 'b');
		assert.equal(rule.get(1).name(), 'g');

		rule.get(0).value('foo');
		rule.get(1).value('bar');
		assert.equal(rule.source, 'a{b:foo; d{e:f} g:bar }');
	});
});
