var assert = require('assert');
var editor = require('../stubs/editor');
var parser = require('../../lib/parser/abbreviation');
var action = require('../../lib/action/updateTag');
var utils  = require('../../lib/utils/common');

describe('Update Tag action', function() {
	var run = function(abbr) {
		editor.setPromptOutput(abbr);
		action.updateTagAction(editor);
	};

	it('should work', function() {
		editor.replaceContent('<span class="c1 c2" title="hello">$0</span>');

		run('.-c2');
		assert.equal(editor.getContent(), '<span class="c1" title="hello"></span>');

		run('.+c3[-title a=b]');
		assert.equal(editor.getContent(), '<span class="c1 c3" a="b"></span>');

		run('div.+c3[-a]');
		assert.equal(editor.getContent(), '<div class="c1 c3"></div>');

		run('.c$$$');
		assert.equal(editor.getContent(), '<div class="c001"></div>');
	});
});
