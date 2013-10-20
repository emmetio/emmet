var assert = require('assert');
var editor = require('../stubs/editor');
var action = require('../../lib/action/mergeLines');

describe('Merge Lines action', function() {
	it('should work', function() {
		editor.replaceContent('<b class="$test">\n\n${0}\n\n</b>');

		action.mergeLinesAction(editor);
		assert.equal(editor.getContent(), '<b class="$test"></b>');
		
		editor.replaceContent('a\nb\nc\nd\ne');
		editor.createSelection(4, 9);
		action.mergeLinesAction(editor);
		assert.equal(editor.getContent(), 'a\nb\ncde');
	});
});
