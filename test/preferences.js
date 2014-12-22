var assert = require('assert');
var prefs = require('../lib/assets/preferences');

describe('Preferences', function() {
	function pluck(arr, key) {
		return arr.map(function(item) {
			return item[key];
		});
	}

	it('should work', function() {
		prefs._startTest();
		
		prefs.define('a', 1, 'test');
		assert.equal(prefs.get('a'), 1, 'Preference "a" is set to 1');
		assert.equal(prefs.description('a'), 'test', 'Preference\'s "a" description is "test"');
		
		prefs.define({
			b: 'v1',
			c: 'v2',
			d: {p: 1}
		});
		
		assert.equal(prefs.get('b'), 'v1', 'Successfully set property "b"');
		assert.equal(prefs.get('c'), 'v2', 'Successfully set property "c"');
		assert.deepEqual(prefs.get('d'), {p: 1}, 'Successfully set property "d"');
		
		var list = prefs.list();
		assert.deepEqual(pluck(list, 'name'), ['a', 'b', 'c', 'd'], 'Listed all properties');
		assert.deepEqual(pluck(list, 'value'), [1, 'v1', 'v2', {p: 1}], 'Listed all values');
		
		prefs.remove('d');
		assert.deepEqual(pluck(prefs.list(), 'name'), ['a', 'b', 'c'], 'Removed property "d"');
		
		prefs._stopTest();
	});
});
