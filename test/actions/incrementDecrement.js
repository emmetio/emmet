var assert = require('assert');
var editor = require('../stubs/editor');
var action = require('../../lib/action/incrementDecrement');

describe('Increment/Decrement Number action', function() {
	var run = function(value) {
		return action.incrementNumber(editor, value);
	};

	it('should increment value', function() {
		editor.replaceContent('a 1${0} b');

		run(1);
		assert.equal(editor.getContent(), 'a 2 b');
		
		run(10);
		assert.equal(editor.getContent(), 'a 12 b');
		
		run(0.1);
		assert.equal(editor.getContent(), 'a 12.1 b');

		editor.replaceContent('index${0}1.html');
		run(1);
		assert.equal(editor.getContent(), 'index2.html');
	});

	it('should decrement value', function() {
		editor.replaceContent('a 12${0}.1 b');

		run(-0.1);
		assert.equal(editor.getContent(), 'a 12 b');
		
		run(-10);
		assert.equal(editor.getContent(), 'a 2 b');
		
		run(-1);
		assert.equal(editor.getContent(), 'a 1 b');
	});
});