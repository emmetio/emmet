(function() {
	var actions = zen_coding.require('actions');
	var run = _.bind(actions.run, actions);
	zen_coding.require('utils').setCaretPlaceholder('|');
	
	module('Actions');
	test('Expand Abbreviatoin', function() {
		var content = 'a>b| test';
		editorStub.replaceContent(content);
		
		run('expand_abbreviation', editorStub);
		
		equal(editorStub.getContent(), '<a href=""><b></b></a> test', 'Expanded abbreviation ' + content);
		equal(editorStub.getCaretPos(), 9, 'Correctly placed cursor in ' + content);
	});
	
	test('Move to edit points', function() {
		var content = '|<a href="">\n\t<b></b>\n\t\n</a>';
		editorStub.replaceContent(content);
		
		run('next_edit_point', editorStub);
		equal(editorStub.getCaretPos(), 9, 'Movet caret into empty attribute (forward)');
		
		run('next_edit_point', editorStub);
		equal(editorStub.getCaretPos(), 16, 'Movet caret into <b> tag (forward)');
		
		run('next_edit_point', editorStub);
		equal(editorStub.getCaretPos(), 22, 'Movet caret into empty line (forward)');
		
		run('next_edit_point', editorStub);
		equal(editorStub.getCaretPos(), 22, 'No movement (forward)');
		
		editorStub.setCaretPos(content.length);
		
		run('prev_edit_point', editorStub);
		equal(editorStub.getCaretPos(), 22, 'Movet caret into empty line (backward)');
		
		run('prev_edit_point', editorStub);
		equal(editorStub.getCaretPos(), 16, 'Movet caret into <b> tag (backward)');
		
		run('prev_edit_point', editorStub);
		equal(editorStub.getCaretPos(), 9, 'Movet caret into empty attribute (backward)');
		
		run('prev_edit_point', editorStub);
		equal(editorStub.getCaretPos(), 9, 'No movement (backward)');
	});
	
	test('Evaluate math expression', function() {
		var content = 'hello 2+4| world';
		editorStub.replaceContent(content);
		run('evaluate_math_expression', editorStub);
		equal(editorStub.getContent(), 'hello 6 world', 'Evaluated expression in ' + content);
		
		editorStub.replaceContent(content = 'hello 2*4| world');
		run('evaluate_math_expression', editorStub);
		equal(editorStub.getContent(), 'hello 8 world', 'Evaluated expression in ' + content);
		
		editorStub.replaceContent(content = 'hello 12*4| world');
		editorStub.createSelection(7, 10);
		run('evaluate_math_expression', editorStub);
		equal(editorStub.getContent(), 'hello 18 world', 'Evaluated expression in ' + content);
		
		editorStub.replaceContent(content = 'hello 11\\2| world');
		run('evaluate_math_expression', editorStub);
		equal(editorStub.getContent(), 'hello 6 world', 'Evaluated expression in ' + content);
	});
	
	test('Increment/decrement', function() {
		editorStub.replaceContent('a 1| b');
		run('increment_number_by_1', editorStub);
		equal(editorStub.getContent(), 'a 2 b', 'Incremented number by 1');
		
		run('increment_number_by_10', editorStub);
		equal(editorStub.getContent(), 'a 12 b', 'Incremented number by 10');
		
		run('increment_number_by_01', editorStub);
		equal(editorStub.getContent(), 'a 12.1 b', 'Incremented number by 0.1');
		
		editorStub.setCaretPos(4);
		run('decrement_number_by_01', editorStub);
		equal(editorStub.getContent(), 'a 12 b', 'Decremented number by 0.1');
		
		run('decrement_number_by_10', editorStub);
		equal(editorStub.getContent(), 'a 2 b', 'Decremented number by 10');
		
		run('decrement_number_by_1', editorStub);
		equal(editorStub.getContent(), 'a 1 b', 'Decremented number by 1');
		
		editorStub.replaceContent('index|1.html');
		run('increment_number_by_1', editorStub);
		equal(editorStub.getContent(), 'index2.html', 'Incremented number in filename by 1');
		
	});
	
	test('Formatted line breaks', function() {
		editorStub.replaceContent('<a>|</a>');
		run('insert_formatted_line_break', editorStub);
		equal(editorStub.getContent(), '<a>\n\t\n</a>', 'Inserted linebreak between HTML tags');
		
		run('insert_formatted_line_break', editorStub);
		equal(editorStub.getContent(), '<a>\n\t\n\t\n</a>', 'Inserted linebreak with indentation');
		
		editorStub.setSyntax('css');
		
		editorStub.replaceContent('.a {|');
		run('insert_formatted_line_break', editorStub);
		equal(editorStub.getContent(), '.a {\n\t\n}', 'Inserted linebreak after CSS open brace');
		
		editorStub.replaceContent('.a {|}');
		run('insert_formatted_line_break', editorStub);
		equal(editorStub.getContent(), '.a {\n\t\n}', 'Inserted linebreak in CSS braces');
		
		editorStub.replaceContent('.a |{}');
		run('insert_formatted_line_break', editorStub);
		equal(editorStub.getContent(), '.a \n{}', 'Inserted linebreak in CSS braces');
		
		editorStub.setSyntax('html');
	});
})();
