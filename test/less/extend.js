var _ = require('lodash');
var assert = require('assert');
var testUtils = require('../testUtils');
var cssSections = require('../../lib/utils/cssSections');
var lessResolver = require('../../lib/resolver/less');
var preprocessor = require('../../lib/resolver/preprocessor');
var selector = require('../../lib/assets/selector');

describe('LESS extend', function() {
	function np(ix, path) {
		return 'Rule ' + (ix + 1) + ': ' + selector.normalize(path.join(' / '));
	}

	function cleanUp(item) {
		// remove nodes with empty contents
		return item.node.content()
			.replace(lessResolver.reExtend, '')
			.replace(/\s+/g, '');
	}

	testUtils.getFileSet('preprocessors/less/extend', 'less').slice(0, 1).forEach(function(item) {
		it('on file ' + item.preprocessor, function() {
			var lessFile = testUtils.readFile(item.preprocessor);
			var cssFile = testUtils.readFile(item.css);

			var lessTree = cssSections.sectionTree(lessFile);
			var cssTree = cssSections.sectionTree(cssFile);
			
			var less = lessResolver.resolve(lessTree).filter(function(item) {
				// remove nodes with empty contents
				return !!cleanUp(item);
			});
			var css = preprocessor.resolve(cssTree);

			// console.log(_.pluck(css, 'path'));
			less.forEach(function(item, i) {
				assert.deepEqual(np(i, item.path), np(i, css[i].path));
			});
		});
	});
});