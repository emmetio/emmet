var assert = require('assert');
var editor = require('../stubs/editor');
var action = require('../../lib/action/expandAbbreviation');

function run(content) {
	if (typeof content !== 'undefined') {
		editor.replaceContent(content);
	}
	action.expandAbbreviationAction(editor);
};

describe('Expand Abbreviation action', function() {
	it('should expand basic abbreviations', function() {
		run('a>b${0} test');
		assert.equal(editor.getContent(), '<a href=""><b></b></a> test');
	});
});