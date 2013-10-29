var assert = require('assert');
var editor = require('../stubs/editor');
var action = require('../../lib/action/selectLine');

describe('Select Line action', function() {
	var run = function(content) {
		if (content) {
			editor.replaceContent(content);
		}
		action.selectLineAction(editor);
	};

	it('should work', function() {
		run('Lorem\nipsum dol${0}or sit\namet');
		assert.equal(editor.getSelection(), 'ipsum dolor sit');
	});
});
