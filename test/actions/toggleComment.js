var assert = require('assert');
var editor = require('../stubs/editor');
var action = require('../../lib/action/toggleComment');

describe('Toggle Comment action', function() {
	var run = function(content) {
		if (content) {
			editor.replaceContent(content);
		}
		action.toggleCommentAction(editor);
	};

	it('should work for HTML', function() {
		run('hello <sp${0}an>world</span>');
		assert.equal(editor.getContent(), 'hello <!-- <span>world</span> -->');
		
		editor.setCaretPos(12);
		run();
		assert.equal(editor.getContent(), 'hello <span>world</span>');
	});

	it('should work for CSS', function() {
		editor.setSyntax('css');
		
		run('a {color: red; font-weight:${0} bold;} b {color: black;}');
		assert.equal(editor.getContent(), 'a {color: red; /* font-weight: bold; */} b {color: black;}');
		
		editor.setCaretPos(18);
		run();
		assert.equal(editor.getContent(), 'a {color: red; font-weight: bold;} b {color: black;}');
		
		editor.setCaretPos(1);
		run();
		assert.equal(editor.getContent(), '/* a {color: red; font-weight: bold;} */ b {color: black;}');
		
		editor.setSyntax('html');
	});
});
