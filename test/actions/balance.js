var assert = require('assert');
var range = require('../../lib/assets/range');
var utils = require('../../lib/utils/common');
var editor = require('../stubs/editor');
var action = require('../../lib/action/balance');
var cssEditTree = require('../../lib/editTree/css');

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
		editor.replaceContent('<li>${1:item 1}</li>');
		action.balanceInwardAction(editor);
		compareRange([0, 15]);

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

	it('should match CSS properties outward', function() {
		editor.setSyntax('css');
		editor.replaceContent('s1{b:c;} s2{\n\ta:b;\n\tc:d$0\n}');

		// select value
		action.balanceOutwardAction(editor);
		compareRange([22, 23]);

		// full property
		action.balanceOutwardAction(editor);
		compareRange([20, 23]);

		// actual content
		action.balanceOutwardAction(editor);
		compareRange([14, 23]);

		// braces content
		action.balanceOutwardAction(editor);
		compareRange([12, 24]);

		// full selector
		action.balanceOutwardAction(editor);
		compareRange([9, 25]);

		// no selection change here
		action.balanceOutwardAction(editor);
		compareRange([9, 25]);

		editor.setSyntax('html');
	});

	it('should match CSS properties inward', function() {
		editor.setSyntax('css');
		editor.replaceContent('s1{b:c;} s${0}2{\n\ta:b;\n\tc:d\n}');

		// full selector
		action.balanceInwardAction(editor);
		compareRange([9, 25]);

		// braces content
		action.balanceInwardAction(editor);
		compareRange([12, 24]);

		// actual content
		action.balanceInwardAction(editor);
		compareRange([14, 23]);

		// full property
		action.balanceInwardAction(editor);
		compareRange([14, 18]);

		// select value
		action.balanceInwardAction(editor);
		compareRange([16, 17]);

		// no selection change here
		action.balanceInwardAction(editor);
		compareRange([16, 17]);

		editor.setSyntax('html');
	});

	it('should match nested sections outward', function() {
		editor.setSyntax('css');
		editor.replaceContent('s1{a:b;} s2{ s3${0}{c:d} }');

		action.balanceOutwardAction(editor);
		compareRange([13, 20]);

		action.balanceOutwardAction(editor);
		compareRange([12, 21]);

		action.balanceOutwardAction(editor);
		compareRange([9, 22]);
		
		editor.setSyntax('html');
	});

	it('should match nested sections inward', function() {
		editor.setSyntax('css');
		editor.replaceContent('s1 {a:b;} ${0}s2 { .ss, s3[a="b"]{c:d; s5{}} e:f; s4{g:h;} j:k; }');

		action.balanceInwardAction(editor);
		compareRange([10, 61]);

		action.balanceInwardAction(editor);
		compareRange([14, 60]);

		action.balanceInwardAction(editor);
		compareRange([15, 59]);

		action.balanceInwardAction(editor);
		compareRange([15, 40]);

		action.balanceInwardAction(editor);
		compareRange([30, 39]);

		action.balanceInwardAction(editor);
		compareRange([30, 34]);

		action.balanceInwardAction(editor);
		compareRange([32, 33]);
		
		editor.setSyntax('html');
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