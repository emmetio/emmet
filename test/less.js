var assert = require('assert');
var parser = require('../lib/parser/css');
var editTree = require('../lib/editTree/css');
var cssSections = require('../lib/utils/cssSections');
var range = require('../lib/assets/range');
var fs = require('fs');
var path = require('path');

describe('LESS', function() {
	var lessFile = fs.readFileSync(path.join(__dirname, 'preprocessors/basic.less'), {encoding: 'utf8'});
	
	it('should parse basic file', function() {
		var tokens = parser.parse(lessFile);
		assert(tokens.length > 0);
	});

	it('should build editable tree', function() {
		// scan sections and selectors
		var allSections = cssSections.findAllRules(lessFile);
		var showContents = function(node) {
			console.log('\n%s:', node.name());

			var output = function(node, indent) {
				indent = indent || '  ';
				node.list().forEach(function(item) {
					if (item.type == 'container') {
						console.log('%s%s:', indent, item.name().trim());
						output(item, indent + '    ');
					} else {
						console.log(indent, item.name().trim(), ': ', item.value());
					}
				});
			};

			output(node);
		};

		var tree, node;

		tree = editTree.parseFromPosition(lessFile, 105);
		assert.equal(tree.name(), '#header');
		assert.equal(tree.get(0).name(), 'color');
		assert.equal(tree.get(0).value(), '@light-blue');

		tree = editTree.parseFromPosition(lessFile, 147);
		assert.equal(tree.name(), '.class1');
		assert.equal(tree.get(0).name(), '@fnord');
		assert.equal(tree.get(0).value(), '1');
		assert.equal(tree.get(1).name(), 'one');
		assert.equal(tree.get(1).value(), '@fnord');

		tree = editTree.parseFromPosition(lessFile, 549);
		assert.equal(tree.name(), '#menu a');
		assert.equal(tree.get(0).name(), 'color');
		assert.equal(tree.get(0).value(), '#111');
		assert.equal(tree.get(1).name(), '.bordered');
		assert.equal(tree.get(1).value(), '');
		assert.equal(tree.get(2).name(), 'padding');
		assert.equal(tree.get(2).value(), '10px');

		tree = editTree.parseFromPosition(lessFile, 733);
		assert.equal(tree.name(), '&:hover');
		assert.equal(tree.get(0).name(), 'text-decoration');
		assert.equal(tree.get(0).value(), 'none');

		tree = editTree.parseFromPosition(lessFile, 1090);
		assert.equal(tree.name(), '.@{name}');
		assert.equal(tree.get(0).name(), 'color');
		assert.equal(tree.get(0).value(), 'black');
		assert.equal(tree.get(1).name(), 'filter');
		assert.equal(tree.get(1).value(), '~"ms:alwaysHasItsOwnSyntax.For.@{what}()"');
	});
});