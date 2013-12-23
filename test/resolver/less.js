var assert = require('assert');
var fs = require('fs');
var path = require('path');
var cssSections = require('../../lib/utils/cssSections');
var lessResolver = require('../../lib/resolver/less.js');

describe('LESS selector resolver', function() {
	var lessFile = fs.readFileSync(path.join(__dirname, '../preprocessors/basic.less'), {encoding: 'utf8'});
	it('should work', function() {
		var tree = cssSections.sectionTree(lessFile);

		var resolved = lessResolver.resolve(tree);

		resolved.forEach(function(item) {
			console.log(item.selectorString);
		});
	});
});