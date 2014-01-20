var assert = require('assert');
var fs = require('fs');
var path = require('path');
var cssSections = require('../../lib/utils/cssSections');
var scssResolver = require('../../lib/resolver/scss');

describe('SCSS selector resolver', function() {
	var scssFile = fs.readFileSync(path.join(__dirname, '../preprocessors/resolver.scss'), {encoding: 'utf8'});
	it('should work', function() {
		var tree = cssSections.sectionTree(scssFile);
		var resolved = scssResolver.resolve(tree, {mock: true});
		// console.log(resolved);
		// var expectedResult = [
		// 	['.bordered'],
		// 	['#header'],
		// 	['#header .navigation'],
		// 	['#header .logo'],
		// 	['#header .logo:hover'],
		// 	['.one'],
		// 	['@media (width: 400px)', '.one'],
		// 	['@media (width: 400px) and print and color', '.one'],
		// 	['div, p'],
		// 	['p'],
		// 	['.a.b.test, .test.c, .a.b.replacement, .replacement.c'],
		// 	['.test, .replacement'],
		// 	['.test:hover, .replacement:hover'],
		// 	['.replacement'],
		// 	['#bundle'],
		// 	['#header a']
		// ];

		// resolved.forEach(function(item, i) {
		// 	assert.deepEqual(item.path, expectedResult[i]);
		// 	console.log('[%s] points to [%s]', item.path.join(', '), item.node.name());
		// });
	});
});