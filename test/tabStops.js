var assert = require('assert');
var tabStops = require('../lib/assets/tabStops');

describe('Tab Stops module', function() {
	it('should locate and update tabstops', function() {
		var text = 'Hello ${0:world} ${1:other placeholder} \\${2:escaped}$3';
		var data = tabStops.extract(text);
		
		assert.equal(data.text, 'Hello world other placeholder \\${2:escaped}', 'Placeholders expanded correctly');
		assert.deepEqual(data.tabstops, [
			{start: 6, end: 11, group: '0'}, 
			{start: 12, end: 29, group: '1'}, 
			{start: 43, end: 43, group: '3'}
		]);
	});

	it('should handle nested tabstops', function() {
		var tsOptions = {
			tabstop: function(data) {
				return tabStops.processText(data.placeholder, tsOptions);
			}
		};
		var text = '${1:one ${2:two}}';
		var processedText = tabStops.processText(text, tsOptions);
		assert.equal(processedText, 'one two', 'Processed nested tabstops');
	});
});
