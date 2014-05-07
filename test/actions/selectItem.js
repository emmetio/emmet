var assert = require('assert');
var editor = require('../stubs/editor');
var action = require('../../lib/action/selectItem');

describe('Select Next/Previous Item action', function() {
	var sel = function() {
		return editor.getSelectionRange();
	};

	var next = function() {
		action.selectNextItemAction(editor);
		return sel();
	};

	var prev = function() {
		action.selectPreviousItemAction(editor);
		return sel();
	};

	var r = function(start, end) {
		return {start: start, end: end};
	}

	it('should handle issue #280', function() {
		editor.setSyntax('css');

		editor.replaceContent('div {padding: 10px;${0}}');
		assert.deepEqual(prev(), r(14, 18));

		editor.setSyntax('html');
	});

	it('should work for CSS', function() {
		editor.setSyntax('css');
		
		editor.replaceContent('${0}a {color: red; border: 1px solid black;}');
		assert.deepEqual(next(), r(0, 1), 'Selector matched');
		assert.deepEqual(next(), r(3, 14), 'Full property matched');
		assert.deepEqual(next(), r(10, 13), 'Property value matched');
		assert.deepEqual(next(), r(15, 39), 'Advanced to next property');
		assert.deepEqual(next(), r(23, 38), 'Selected "border" property value');
		assert.deepEqual(next(), r(23, 26), 'Selected "1px" of "border" property');
		assert.deepEqual(next(), r(27, 32), 'Selected "solid" of "border" property');
		assert.deepEqual(next(), r(33, 38), 'Selected "black" of "border" property');
		assert.deepEqual(next(), r(33, 38), 'No selection change');
		
		// test previous item
		assert.deepEqual(prev(), r(27, 32), 'Selected "solid" of "border" property (backward)');
		assert.deepEqual(prev(), r(23, 26), 'Selected "1px" of "border" property (backward)');
		assert.deepEqual(prev(), r(23, 38), 'Selected "border" property value');
		assert.deepEqual(prev(), r(15, 39), 'Advanced to previous property');
		assert.deepEqual(prev(), r(10, 13), 'Previous property value matched');
		assert.deepEqual(prev(), r(3, 14), 'Previous property fully matched');
		assert.deepEqual(prev(), r(0, 1), 'Selector matched (backward)');
		
		editor.setCaretPos(10);
		assert.deepEqual(next(), r(10, 13), 'Selected value under caret');
		
		editor.replaceContent('a{bg:${0}lg(rgba(0,0,0,0));}');
		assert.deepEqual(next(), r(5, 22));
		assert.deepEqual(next(), r(8, 21));

		editor.replaceContent('a{background:${0} 50px 50px url(image.png) no-repeat;}');
		assert.deepEqual(next(), r(2,  49));
		assert.deepEqual(next(), r(14, 48));
		assert.deepEqual(next(), r(14, 18));
		assert.deepEqual(next(), r(19, 23));
		assert.deepEqual(next(), r(24, 38));
		assert.deepEqual(next(), r(28, 37));
		assert.deepEqual(next(), r(39, 48));

		// edge case, previously buggy
		editor.replaceContent('a{b:c; ${0} d:e;}');
		assert.deepEqual(prev(), r(4, 5));
		
		editor.setSyntax('html');
	});

	it('should work for CSS with nested sections', function() {
		editor.setSyntax('css');

		// move next
		editor.replaceContent('${0}a { b:c; d { e:f } g:h }');
		assert.deepEqual(next(), r(0, 1));   // Selector matched
		assert.deepEqual(next(), r(4, 8));   // Full property matched
		assert.deepEqual(next(), r(6, 7));   // Property value matched

		assert.deepEqual(next(), r(9, 10));   // Nested section selector
		assert.deepEqual(next(), r(13, 16)); // Nested section full property
		assert.deepEqual(next(), r(15, 16)); // Nested section property value

		assert.deepEqual(next(), r(19, 22)); // Outer full property
		assert.deepEqual(next(), r(21, 22)); // Outer property value
		
		editor.setSyntax('html');
	});

	it('should work for CSS in HTML', function() {
		editor.setSyntax('css');
		
		editor.replaceContent('<style>a{${0}}</style>');
		assert.deepEqual(prev(), r(7, 8));

		// editor.replaceContent('<div style="p:10;${0}"></div>');
		// assert.deepEqual(prev(), r(12, 17));

		editor.setSyntax('html');
	});

	it('should work for HTML', function() {
		editor.replaceContent('${0}<div class="hello world" b=1>text</div> <b class="large">text 2</b>');
		assert.deepEqual(next(), r(1, 4), 'Matched "div" tag name');
		assert.deepEqual(next(), r(5, 24), 'Matched full "class" attribute');
		assert.deepEqual(next(), r(12, 23), 'Matched "class" value');
		assert.deepEqual(next(), r(12, 17), 'Matched "hello" class name');
		assert.deepEqual(next(), r(18, 23), 'Matched "world" class name');
		assert.deepEqual(next(), r(25, 28), 'Matched full "b" attribute');
		assert.deepEqual(next(), r(27, 28), 'Matched "b" value');
		assert.deepEqual(next(), r(41, 42), 'Moved to <b> tag, selected tag name');
		assert.deepEqual(next(), r(43, 56), 'Matched full "class" attribute of <b> tag');
		assert.deepEqual(next(), r(50, 55), 'Selected "class" value of <b> tag');
		assert.deepEqual(next(), r(50, 55), 'No movement');
		
		assert.deepEqual(prev(), r(43, 56), 'Selected full "class" attribute of <b> tag (backward)');
		assert.deepEqual(prev(), r(41, 42), 'Selected <b> tag name (backward)');
		assert.deepEqual(prev(), r(27, 28), 'Matched "b" value (backward)');
		assert.deepEqual(prev(), r(25, 28), 'Matched full "b" attribute (backward)');
		assert.deepEqual(prev(), r(18, 23), 'Matched "world" class name (backward)');
		assert.deepEqual(prev(), r(12, 17), 'Matched "hello" class name (backward)');
		assert.deepEqual(prev(), r(12, 23), 'Matched "class" value (backward)');
		assert.deepEqual(prev(), r(5, 24), 'Matched full "class" attribute (backward)');
		assert.deepEqual(prev(), r(1, 4), 'Matched "div" tab name (backward)');
		assert.deepEqual(prev(), r(1, 4), 'No movement (backward)');
		
		editor.setCaretPos(16);
		assert.deepEqual(next(), r(12, 23), 'Selected attribute value first');
	});
});
