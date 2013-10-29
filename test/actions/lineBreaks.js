var assert = require('assert');
var editor = require('../stubs/editor');
var action = require('../../lib/action/lineBreaks');

describe('Insert Formatted Line Break action', function() {
	var run = function() {
		return action.insertLineBreakAction(editor);
	};

	it('should work for HTML', function() {
		editor.replaceContent('<a>${0}</a>');
		run();
		assert.equal(editor.getContent(), '<a>\n\t\n</a>');
		
		run();
		assert.equal(editor.getContent(), '<a>\n\t\n\t\n</a>');
	});

	it('should work for CSS', function() {
		editor.setSyntax('css');
		
		editor.replaceContent('.a {${0}');
		run();
		assert.equal(editor.getContent(), '.a {\n\t\n}');
		
		editor.replaceContent('.a {${0}}');
		run();
		assert.equal(editor.getContent(), '.a {\n\t\n}');
		
		editor.replaceContent('.a ${0}{}');
		run();
		assert.equal(editor.getContent(), '.a \n{}');
		
		editor.setSyntax('html');
	});
});