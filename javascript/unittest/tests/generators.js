(function() {
	var actions = emmet.require('actions');
	var run = function(name) {
		actions.run(name, editorStub);
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
	
	module('Generators');
	test('Lorem ipsum', function() {
		editorStub.replaceContent('lipsum$0');
		run('expand_abbreviation');
		equal(wordCount(editorStub.getContent()), 30, 'Generated 30 words of lorem ipsum');
		
		editorStub.replaceContent('lipsum10$0');
		run('expand_abbreviation');
		equal(wordCount(editorStub.getContent()), 10, 'Generated 10 words of lorem ipsum');
		
		editorStub.replaceContent('ul>li*3>lipsum4$0');
		run('expand_abbreviation');
		equal(matchesCount(editorStub.getContent(), /<ul>/g), 1, 'Output has one `<ul>` element');
		equal(matchesCount(editorStub.getContent(), /<li>/g), 3, 'Output has three `<li>` elements');
		
		
		editorStub.replaceContent('ul>lipsum*5$0');
		run('expand_abbreviation');
		equal(matchesCount(editorStub.getContent(), /<li>/g), 5, 'Output has five auto-generated `<li>` elements');
	});
})();
