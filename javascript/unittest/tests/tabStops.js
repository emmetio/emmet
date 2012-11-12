module('Tab Stops');
test('Locate and update tabstops', function() {
	var ts = emmet.require('tabStops');
	
	var text = 'Hello ${0:world} ${1:other placeholder} \\${2:escaped}$3';
	var data = ts.extract(text);
	
	equal(data.text, 'Hello world other placeholder \\${2:escaped}', 'Placeholders expanded correctly');
	deepEqual(data.tabstops, [
	                          {start: 6, end: 11, group: '0'}, 
	                          {start: 12, end: 29, group: '1'}, 
	                          {start: 43, end: 43, group: '3'}
	                         ], 'Placeholders located correctly');
});

test('Nested tabstops', function() {
	var ts = emmet.require('tabStops');
	var tsOptions = {
		tabstop: function(data) {
			return ts.processText(data.placeholder, tsOptions);
		}
	};
	var text = '${1:one ${2:two}}';
	var processedText = ts.processText(text, tsOptions);
	equal(processedText, 'one two', 'Processed nested tabstops');
});