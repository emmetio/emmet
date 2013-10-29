var assert = require('assert');
var editor = require('./stubs/editor');
var action = require('../lib/action/expandAbbreviation');

describe('Generators', function() {
	var run = function(content) {
		if (content) {
			editor.replaceContent(content);
		}
		action.expandAbbreviationAction(editor);
	};
	
	function wordCount(text) {
		return text.split(/\s+/).length;
	}
	
	function matchesCount(str, re) {
		var result = 0;
		str.replace(re, function() {
			result++;
			return '';
		});
		
		return result;
	}

	it('should generate Lorem Ipsum dummy text', function() {
		run('lipsum$0');
		assert.equal(wordCount(editor.getContent()), 30, 'Generated 30 words of lorem ipsum');
		
		run('lipsum10$0');
		assert.equal(wordCount(editor.getContent()), 10, 'Generated 10 words of lorem ipsum');
		
		run('ul>li*3>lipsum4$0');
		assert.equal(matchesCount(editor.getContent(), /<ul>/g), 1, 'Output has one `<ul>` element');
		assert.equal(matchesCount(editor.getContent(), /<li>/g), 3, 'Output has three `<li>` elements');
		
		
		run('ul>lipsum*5$0');
		assert.equal(matchesCount(editor.getContent(), /<li>/g), 5, 'Output has five auto-generated `<li>` elements');
	});	
});
