var assert = require('assert');
var sections = require('../lib/utils/cssSections');
var fs = require('fs');
var path = require('path');

describe('CSS sections', function() {
	var largeCSS = fs.readFileSync(path.join(__dirname, 'stubs/ayyo.css'), {encoding: 'utf8'});

	it('should properly match braces', function() {
		var content = ' a{ b{} c{ d{} e{ /* } */  } } }';
		var match = function(pos) {
			var r = sections.matchEnclosingRule(content, pos);
			return r && r.toArray();
		};

		assert.deepEqual(match(20), [15, 28]);
		assert.deepEqual(match(13), [11, 14]);
		assert.deepEqual(match(14), [8, 30]);
		assert.deepEqual(match(30), [1, 32]);
		assert.equal(match(0), void 0);
	});

	it('should extract selector', function() {
		var content = 'a { b {} c,\n/* d, } */\ne {} }';
		var extract = function(pos) {
			var selRange = sections.extractSelector(content, pos, true);
			return selRange ? selRange.substring(content) : '';
		};

		assert.equal(extract(25), 'c,\n/* d, } */\ne');
		assert.equal(extract(2), 'a');
		assert.equal(extract(5), 'b');

		content = 'a { .sample, div[title~="test"] {} c,\ne {} }';
		assert.equal(extract(32), '.sample, div[title~="test"]');
	});

	it('should parse CSS sections into a tree', function() {
		var tree = sections.sectionTree('a { b {} c,\n/* d, } */\ne {} } f { padding: 10px; g {} }');
		assert.equal(tree.children.length, 2);

		var node = tree.children[0];
		assert.equal(node.name(), 'a');
		assert.equal(node.children.length, 2);

		assert.equal(node.children[0].name(), 'b');
		assert.equal(node.children[1].name(), 'c,\n/* d, } */\ne');

		node = tree.children[1];
		assert.equal(node.name(), 'f');
		assert.equal(node.children.length, 1);
		assert.equal(node.children[0].name(), 'g');
	});

	it('should locate nested sections for given position', function() {
		var tree = sections.sectionTree('a { b {} c,\n/* d, } */\ne {} } f { padding: 10px; g {} }');

		assert.equal(tree.matchDeep(26).name(), 'c,\n/* d, } */\ne');
		assert.equal(tree.matchDeep(34).name(), 'f');
		assert.equal(tree.matchDeep(52).name(), 'g');
		assert.equal(tree.matchDeep(2).name(), 'a');
	});

	it('should extract content from section', function() {
		var tree = sections.sectionTree('a {b:c;d {}e:f; } g { h:i }');

		assert.equal(tree.children[0].content(), 'b:c;e:f;');
		assert.equal(tree.children[1].content(), 'h:i');
	});

	// it.only('should work fast on finding CSS sections', function() {
	// 	// sections.stripComments(largeCSS);
	// 	var rules = sections.findAllRules(largeCSS);
	// 	// var tree = sections.sectionTree(largeCSS);
	// 	// console.log('Top-level rules:', tree.children.length);
	// 	assert(true);
	// });
});