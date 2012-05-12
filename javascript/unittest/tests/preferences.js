module('Preferences');
test('Check preferences', function() {
	/** @type zen_coding.preferences */
	var prefs = zen_coding.require('preferences');
	prefs._startTest();
	
	prefs.set('a', 1, 'test');
	equal(prefs.get('a'), 1, 'Preference "a" is set to 1');
	equal(prefs.description('a'), 'test', 'Preference\'s "a" description is "test"');
	
	prefs.set({
		b: 'v1',
		c: {
			value: 'v2'
		},
		d: {p: 1}
	});
	
	equal(prefs.get('b'), 'v1', 'Successfully set property "b"');
	equal(prefs.get('c'), 'v2', 'Successfully set property "c"');
	deepEqual(prefs.get('d'), {p: 1}, 'Successfully set property "d"');
	
	var list = prefs.list();
	deepEqual(_.pluck(list, 'name'), ['a', 'b', 'c', 'd'], 'Listed all properties');
	deepEqual(_.pluck(list, 'value'), [1, 'v1', 'v2', {p: 1}], 'Listed all values');
	
	prefs.remove('d');
	deepEqual(_.pluck(prefs.list(), 'name'), ['a', 'b', 'c'], 'Removed property "d"');
	
	prefs._stopTest();
});