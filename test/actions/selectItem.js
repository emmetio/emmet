var assert = require('assert');
var editor = require('../stubs/editor');
var action = require('../../lib/action/selectItem');

describe('Select Next/Previous Item action', function() {
	var next = function() {
		action.selectNextItemAction(editor);	
	};

	var prev = function() {
		action.selectPreviousItemAction(editor);	
	};

	var sel = function() {
		return editor.getSelectionRange();
	};

	it('should work for CSS', function() {
		editor.setSyntax('css');
		
		editor.replaceContent('${0}a {color: red; border: 1px solid black;}');
		next();
		assert.deepEqual(sel(), {start: 0, end: 1}, 'Selector matched');
		
		next();
		assert.deepEqual(sel(), {start: 3, end: 14}, 'Full property matched');
		
		next();
		assert.deepEqual(sel(), {start: 10, end: 13}, 'Property value matched');
		
		next();
		assert.deepEqual(sel(), {start: 15, end: 39}, 'Advanced to next property');
		
		next();
		assert.deepEqual(sel(), {start: 23, end: 38}, 'Selected "border" property value');
		
		next();
		assert.deepEqual(sel(), {start: 23, end: 26}, 'Selected "1px" of "border" property');
		
		next();
		assert.deepEqual(sel(), {start: 27, end: 32}, 'Selected "solid" of "border" property');
		
		next();
		assert.deepEqual(sel(), {start: 33, end: 38}, 'Selected "black" of "border" property');
		
		next();
		assert.deepEqual(sel(), {start: 33, end: 38}, 'No selection change');
		
		// test previous item
		prev();
		assert.deepEqual(sel(), {start: 27, end: 32}, 'Selected "solid" of "border" property (backward)');
		
		prev();
		assert.deepEqual(sel(), {start: 23, end: 26}, 'Selected "1px" of "border" property (backward)');
		
		prev();
		assert.deepEqual(sel(), {start: 23, end: 38}, 'Selected "border" property value');
		
		prev();
		assert.deepEqual(sel(), {start: 15, end: 39}, 'Advanced to previous property');
		
		prev();
		assert.deepEqual(sel(), {start: 10, end: 13}, 'Previous property value matched');
		
		prev();
		assert.deepEqual(sel(), {start: 3, end: 14}, 'Previous property fully matched');
		
		prev();
		assert.deepEqual(sel(), {start: 0, end: 1}, 'Selector matched (backward)');
		
		editor.setCaretPos(10);
		next();
		assert.deepEqual(sel(), {start: 10, end: 13}, 'Selected value under caret');
		
		editor.replaceContent('a{bg:${0}lg(rgba(0,0,0,0));}');
		next();
		assert.deepEqual(sel(), {start: 5, end: 22}, 'Selected full value');
		
		next();
		assert.deepEqual(sel(), {start: 8, end: 21}, 'Selected inner function');
		
		editor.setSyntax('html');
	});

	it('should work for HTML', function() {
		editor.replaceContent('${0}<div class="hello world" b=1>text</div> <b class="large">text 2</b>');
		
		next();
		assert.deepEqual(sel(), {start: 1, end: 4}, 'Matched "div" tag name');
		
		next();
		assert.deepEqual(sel(), {start: 5, end: 24}, 'Matched full "class" attribute');
		
		next();
		assert.deepEqual(sel(), {start: 12, end: 23}, 'Matched "class" value');
		
		next();
		assert.deepEqual(sel(), {start: 12, end: 17}, 'Matched "hello" class name');
		
		next();
		assert.deepEqual(sel(), {start: 18, end: 23}, 'Matched "world" class name');
		
		next();
		assert.deepEqual(sel(), {start: 25, end: 28}, 'Matched full "b" attribute');
		
		next();
		assert.deepEqual(sel(), {start: 27, end: 28}, 'Matched "b" value');
		
		next();
		assert.deepEqual(sel(), {start: 41, end: 42}, 'Moved to <b> tag, selected tag name');
		
		next();
		assert.deepEqual(sel(), {start: 43, end: 56}, 'Matched full "class" attribute of <b> tag');
		
		next();
		assert.deepEqual(sel(), {start: 50, end: 55}, 'Selected "class" value of <b> tag');
		
		next();
		assert.deepEqual(sel(), {start: 50, end: 55}, 'No movement');
		
		prev();
		assert.deepEqual(sel(), {start: 43, end: 56}, 'Selected full "class" attribute of <b> tag (backward)');
		
		prev();
		assert.deepEqual(sel(), {start: 41, end: 42}, 'Selected <b> tag name (backward)');
		
		prev();
		assert.deepEqual(sel(), {start: 27, end: 28}, 'Matched "b" value (backward)');
		
		prev();
		assert.deepEqual(sel(), {start: 25, end: 28}, 'Matched full "b" attribute (backward)');
		
		prev();
		assert.deepEqual(sel(), {start: 18, end: 23}, 'Matched "world" class name (backward)');

		prev();
		assert.deepEqual(sel(), {start: 12, end: 17}, 'Matched "hello" class name (backward)');
		
		prev();
		assert.deepEqual(sel(), {start: 12, end: 23}, 'Matched "class" value (backward)');
		
		prev();
		assert.deepEqual(sel(), {start: 5, end: 24}, 'Matched full "class" attribute (backward)');
		
		prev();
		assert.deepEqual(sel(), {start: 1, end: 4}, 'Matched "div" tab name (backward)');
		
		prev();
		assert.deepEqual(sel(), {start: 1, end: 4}, 'No movement (backward)');
		
		editor.setCaretPos(16);
		next();
		assert.deepEqual(sel(), {start: 12, end: 23}, 'Selected attribute value first');
	});
});
