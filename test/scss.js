var assert = require('assert');
var parser = require('../lib/parser/css');
var editTree = require('../lib/editTree/css');
var cssSections = require('../lib/utils/cssSections');
var range = require('../lib/assets/range');
var fs = require('fs');
var path = require('path');

describe('SCSS', function() {
	var scssFile = fs.readFileSync(path.join(__dirname, 'preprocessors/basic.scss'), {encoding: 'utf8'});
	
	it('should parse basic file', function() {
		var tokens = parser.parse(scssFile);
		assert(tokens.length > 0);
	});

	it('should build editable tree', function() {
		// scan sections and selectors
		// var allSections = cssSections.findAllRules(scssFile);
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

		tree = editTree.parseFromPosition(scssFile, 150);
		assert.equal(tree.name(), 'body');
		assert.equal(tree.get(0).name(), 'font');
		assert.equal(tree.get(0).value(), '100% $font-stack');
		assert.equal(tree.get(1).name(), 'color');
		assert.equal(tree.get(1).value(), '$primary-color');

		tree = editTree.parseFromPosition(scssFile, 208);
		assert.equal(tree.name(), 'nav');
		assert.equal(tree.get(0).name(), 'font-size');
		assert.equal(tree.get(0).value(), '20px');
		assert.equal(tree.get(1), undefined);

		tree = editTree.parseFromPosition(scssFile, 234);
		assert.equal(tree.name(), 'ul');
		assert.equal(tree.get(0).name(), 'margin');
		assert.equal(tree.get(0).value(), '0');
		assert.equal(tree.get(1).name(), 'padding');
		assert.equal(tree.get(1).value(), '0');
		assert.equal(tree.get(2).name(), 'list-style');
		assert.equal(tree.get(2).value(), 'none');

		tree = editTree.parseFromPosition(scssFile, 358);
		assert.equal(tree.name(), '@mixin border-radius($radius)');
		assert.equal(tree.get(0).name(), '-webkit-border-radius');
		assert.equal(tree.get(0).value(), '$radius');

		tree = editTree.parseFromPosition(scssFile, 464);
		assert.equal(tree.name(), '.box');
		assert.equal(tree.get(0).name(), '@include');
		assert.equal(tree.get(0).value(), 'border-radius(10px)');

		tree = editTree.parseFromPosition(scssFile, 585);
		assert.equal(tree.name(), '.success');
		assert.equal(tree.get(0).name(), '@extend');
		assert.equal(tree.get(0).value(), '.message');
		assert.equal(tree.get(1).name(), 'border-color');
		assert.equal(tree.get(1).value(), 'green');

		tree = editTree.parseFromPosition(scssFile, 888);
		assert.equal(tree.name(), '#context a%extreme');
		assert.equal(tree.get(0).name(), 'color');
		assert.equal(tree.get(0).value(), 'blue');
		assert.equal(tree.get(1).name(), 'font-weight');
		assert.equal(tree.get(1).value(), 'bold');
		assert.equal(tree.get(2).name(), 'font-size');
		assert.equal(tree.get(2).value(), '2em');

		tree = editTree.parseFromPosition(scssFile, 957);
		assert.equal(tree.name(), '.notice');
		assert.equal(tree.get(0).name(), '@extend');
		assert.equal(tree.get(0).value(), '%extreme');

		tree = editTree.parseFromPosition(scssFile, 1025);
		assert.equal(tree.name(), '@if 1 + 1 == 2');
		assert.equal(tree.get(0).name(), 'border');
		assert.equal(tree.get(0).value(), '1px solid');

		tree = editTree.parseFromPosition(scssFile, 1182);
		assert.equal(tree.name(), 'body.firefox #{$selector}:before');
		assert.equal(tree.get(0).name(), 'content');
		assert.equal(tree.get(0).value(), '"Hi, Firefox users!"');
	});
});