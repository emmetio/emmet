var assert = require('assert');
var parser = require('../lib/parser/css');
var editTree = require('../lib/editTree/css');
var fs = require('fs');
var path = require('path');

describe('LESS', function() {
	var lessFile = fs.readFileSync(path.join(__dirname, 'preprocessors/basic.less'), {encoding: 'utf8'});
	
	it('should parse basic file', function() {
		var tokens = parser.parse(lessFile);
		assert(tokens.length > 0);
	});

	it('should build editable tree', function() {
		var tree = editTree.parse(lessFile);
		assert(true);
	});
});