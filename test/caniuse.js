var assert = require('assert');
var ciu = require('../lib/assets/caniuse');

describe('Can I Use', function() {
	// since main Can I Use database will be changed over time,
	// we can’t use it for test since updated DB may produce
	// different results.
	// So we will load a special static database, for tests only
	var fs = require('fs');
	var path = require('path');
	var db = fs.readFileSync(path.join(__dirname, './stubs/caniuse.json'), {encoding: 'utf8'});
	ciu.load(db);

	it('should resolve CSS properties', function() {
		assert.deepEqual(ciu.resolvePrefixes('columns'), ['webkit', 'moz', 'o']);
		assert.deepEqual(ciu.resolvePrefixes('transform'), ['webkit', 'ms', 'o']);
		assert.deepEqual(ciu.resolvePrefixes('box-shadow'), ['webkit']);
		assert.deepEqual(ciu.resolvePrefixes('transition'), ['webkit', 'o']);
		assert.deepEqual(ciu.resolvePrefixes('border-radius'), []);
		assert.equal(ciu.resolvePrefixes('foo'), null);
	});
});