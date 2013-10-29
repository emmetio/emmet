var assert = require('assert');
var editor = require('../stubs/editor');
var action = require('../../lib/action/removeTag');

describe('Reflect CSS Value action', function() {
	var run = function(content) {
		if (content) {
			editor.replaceContent(content);
		}
		action.removeTagAction(editor);
	};

	it('should work', function() {
		run('hello\n<di${0}v>\n\t<span>world</span>\n</div>');
		assert.equal(editor.getContent(), 'hello\n<span>world</span>');
		
		run('hello <img${0} src="" alt="" /> world');
		assert.equal(editor.getContent(), 'hello  world');
	});
});
