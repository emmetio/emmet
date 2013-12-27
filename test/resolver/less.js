var assert = require('assert');
var fs = require('fs');
var path = require('path');
var cssSections = require('../../lib/utils/cssSections');
var lessResolver = require('../../lib/resolver/less.js');

describe('LESS selector resolver', function() {
	var lessFile = fs.readFileSync(path.join(__dirname, '../preprocessors/resolver.less'), {encoding: 'utf8'});
	it('should work', function() {
		var tree = cssSections.sectionTree(lessFile);
		var resolved = lessResolver.resolve(tree);
		var expectedResult = [
			['.bordered'],
			['#header'],
			['#header .navigation'],
			['#header .logo'],
			['#header .logo:hover'],
			['.one'],
			['@media (width: 400px)', '.one'],
			['@media (width: 400px) and print and color', '.one'],
			['div, p'],
			['p'],
			['.a.b.test, .test.c, .a.b.replacement, .replacement.c'],
			['.test, .replacement'],
			['.test:hover, .replacement:hover'],
			['.replacement'],
			['#bundle'],
			['#header a']
		];

		resolved.forEach(function(item, i) {
			assert.deepEqual(item.path, expectedResult[i]);
			console.log('[%s] points to [%s]', item.path.join(', '), item.node.name());
		});
	});
});