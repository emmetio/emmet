var fs = require('fs');
var path = require('path');
var assert = require('assert');
var scss = require('../lib/resolver/scss');
var cssSections = require('../lib/utils/cssSections');

describe('SCSS Extend', function() {
	var scssFile = fs.readFileSync(path.join(__dirname, 'preprocessors/resolver.scss'), {encoding: 'utf8'});
	it('should work', function() {
		var tree = cssSections.sectionTree(scssFile);
		var list = scss.resolve(tree, {mock: true});
		var result = [
			['#header'],
			['#header .navigation'],
			['#header .logo'],
			['#header .logo:hover'],
			['.one'],
			['@media (width: 400px)', '.one'],
			['@media (width: 400px) and print and (min-width: 100px)', '.one'],
			['.error, .seriousError, .criticalError'],
			['.error.intrusion, .intrusion.seriousError, .intrusion.criticalError'],
			['.attention, .seriousError, .criticalError'],
			['.seriousError, .criticalError'],
			['.seriousError, .criticalError'],
			['@media print', '.seriousError2'],
			['.criticalError'],
			['.hoverlink'],
			['.comment a.user:hover, .comment .user.hoverlink'],
			['#fake-links .link'],
			['b, #fake-links .link'],
			['b:hover, #fake-links .link:hover'],
			['#admin .tabbar i, #admin .tabbar #demo .overview .fakelink, #demo .overview #admin .tabbar .fakelink'],
			['#demo .overview .fakelink'],
			['#admin2 d .tabbar2, #admin2 #demo2 > .overview2 > .fakelink2 .tabbar2'],
			['#demo2 > .overview2 > .fakelink2'],
			['#admin3 e .tabbar3, #admin3 #demo3 .overview3 .fakelink3 .tabbar3, #demo3 .overview3 #admin3 .fakelink3 .tabbar3'],
			['#demo3 .overview3 .fakelink3'],
			['#admin .tabbar c, #admin .tabbar .overview .fakelink, #admin .overview .tabbar .fakelink'],
			['#admin .overview .fakelink'],
			['#context dd.notice'],
			['.notice']
		];

		result.forEach(function(item, i) {
			assert.deepEqual(list[i].path, item);
		});
	});
});