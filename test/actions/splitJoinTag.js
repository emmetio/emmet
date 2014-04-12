var assert = require('assert');
var editor = require('../stubs/editor');
var action = require('../../lib/action/splitJoinTag');

describe('Split/Join Tag action', function() {
	var run = function(content) {
		if (content) {
			editor.replaceContent(content);
		}
		action.splitJoinTagAction(editor);
	};

	it('should work for HTML', function() {
		run('<span class="${0}\\$sample"></span>');
		assert.equal(editor.getContent(), '<span class="$sample" />');
		
		run();
		assert.equal(editor.getContent(), '<span class="$sample"></span>');
	});

	it('should work for XML dialect', function() {
		var oldProfile = editor.getProfileName();
		editor.setProfileName('xml');
		
		run('<div class="${0}sample"></div>');
		assert.equal(editor.getContent(), '<div class="sample"/>');
		
		run();
		assert.equal(editor.getContent(), '<div class="sample">\n\t\n</div>');
		editor.setProfileName(oldProfile);
	});
});
