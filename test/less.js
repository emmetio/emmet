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
		// allSections.forEach(function(item) {
		// 	var r = range.create2(item.start, item._selectorEnd);
		// 	console.log(r.substring(lessFile));
		// });
		// 
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

		var tree;

		tree = editTree.parseFromPosition(lessFile, 105);
		showContents(tree);

		tree = editTree.parseFromPosition(lessFile, 147);
		showContents(tree);

		tree = editTree.parseFromPosition(lessFile, 549);
		showContents(tree);

		tree = editTree.parseFromPosition(lessFile, 650);
		showContents(tree);

		tree = editTree.parseFromPosition(lessFile, 776);
		showContents(tree);

		tree = editTree.parseFromPosition(lessFile, 1000);
		showContents(tree);

		tree = editTree.parseFromPosition(lessFile, 1030);
		showContents(tree);

		assert(true);
	});
});