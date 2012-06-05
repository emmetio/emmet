module('Tab Stops');
test('Locate and update tabstops', function() {
	var ts = zen_coding.require('tabStops');
	
	var text = 'Hello ${0:world} ${1:other placeholder} \\${2:escaped}$3';
	var data = ts.extract(text);
	
	equal(data.text, 'Hello world other placeholder ${2:escaped}', 'Placeholders expanded correctly');
	deepEqual(data.tabstops, [{start: 6, end: 11, group: '0'}, {start: 12, end: 29, group: '1'}, {start: 42, end: 42, group: '3'}], 'Placeholders located correctly');
});