var assert = require('assert');
var editor = require('../stubs/editor');
var action = require('../../lib/action/editPoints');

describe('Move to Edit Point action', function() {
	var content = '<a href="">\n\t<b></b>\n\t\n</a>';

	it('should move caret to next point', function() {
		editor.replaceContent(content);
		editor.setCaretPos(0);
		var run = function() {
			return action.nextEditPointAction(editor);
		};

		run();
		assert.equal(editor.getCaretPos(), 9, 'Movet caret into empty attribute (forward)');

		run();
		assert.equal(editor.getCaretPos(), 16, 'Movet caret into <b> tag (forward)');
		
		run();
		assert.equal(editor.getCaretPos(), 22, 'Movet caret into empty line (forward)');
		
		run();
		assert.equal(editor.getCaretPos(), 22, 'No movement (forward)');
	});

	it('should move caret to previous point', function() {
		editor.replaceContent(content);
		editor.setCaretPos(content.length);
		var run = function() {
			return action.previousEditPointAction(editor);
		};

		run();
		assert.equal(editor.getCaretPos(), 22, 'Movet caret into empty line (backward)');
		
		run();
		assert.equal(editor.getCaretPos(), 16, 'Movet caret into <b> tag (backward)');
		
		run();
		assert.equal(editor.getCaretPos(), 9, 'Movet caret into empty attribute (backward)');
		
		run();
		assert.equal(editor.getCaretPos(), 9, 'No movement (backward)');
	});
});