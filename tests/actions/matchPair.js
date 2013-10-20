var assert = require('assert');
var range = require('../../lib/assets/range');
var utils = require('../../lib/utils/common');
var editor = require('../stubs/editor');
var action = require('../../lib/action/matchPair');

function createMatchString(text, rng, caret) {
	rng = range(rng);
	var result = utils.replaceSubstring(text, '[' + rng.substring(text) + ']', rng);
	
	if (typeof caret != 'undefined' && caret !== null) {
		var delta = 0;
		
		if (rng.start < caret) {
			delta++;
		}
		
		if (rng.end < caret) {
			delta++;
		}
		
		result = utils.replaceSubstring(result, '|', caret + delta);
	}
	
	
	return result;
}

/**
 * A helper assert method to visually compare text ranges
 */
function assertTextRanges(text, actualRange, expectedRange, caretPos) {
	var actual = createMatchString(text, actualRange, caretPos);
	var expected = createMatchString(text, expectedRange, caretPos);
	
	assert.equal(actual, expected);
}

function compareRange(expected) {
	assertTextRanges(editor.getContent(), editor.getSelectionRange(), expected);
}

describe('Balance action', function() {
	it('should match HTML tags', function() {
		editor.replaceContent('Lorem <a><b>ip${0}sum</b></a> dolor sit amet');

		action.balanceOutwardAction(editor);
		compareRange([12, 17]);

		action.balanceOutwardAction(editor);
		compareRange([9, 21]);

		action.balanceOutwardAction(editor);
		compareRange([6, 25]);

		action.balanceInwardAction(editor);
		compareRange([9, 21]);

		action.balanceInwardAction(editor);
		compareRange([12, 17]);
	});
});

describe('Go To Matching Pair action', function() {
	it('should work for HTML tags', function() {
		editor.replaceContent('Lorem <b>ip${0}sum</b> dolor sit amet');

		action.goToMatchingPairAction(editor);
		assert.equal(editor.getCaretPos(), 6);
		
		action.goToMatchingPairAction(editor);
		assert.equal(editor.getCaretPos(), 14);
		
		action.goToMatchingPairAction(editor);
		assert.equal(editor.getCaretPos(), 6);
		
		action.goToMatchingPairAction(editor);
		assert.equal(editor.getCaretPos(), 14);
	});
});