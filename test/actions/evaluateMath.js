var assert = require('assert');
var editor = require('../stubs/editor');
var action = require('../../lib/action/evaluateMath');

describe('Evaluate Math Expression action', function() {
	it('should work', function() {
		var run = function(content) {
			if (content) {
				editor.replaceContent(content);
			}
			return action.evaluateMathAction(editor);
		};

		run('hello 2+4${0} world');
		assert.equal(editor.getContent(), 'hello 6 world');
		
		run('hello 2*4${0} world');
		assert.equal(editor.getContent(), 'hello 8 world');
		
		editor.replaceContent('hello 12*4${0} world');
		editor.createSelection(7, 10);
		run();
		assert.equal(editor.getContent(), 'hello 18 world');
		
		run('hello 11\\\\2${0} world');
		assert.equal(editor.getContent(), 'hello 6 world');
	});
});