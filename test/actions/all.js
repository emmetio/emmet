var assert = require('assert');
var emmet = require('../../lib/emmet');
var editor = require('../stubs/editor');

describe('Action registry', function() {
	var run = function(name, content) {
		if (content) {
			editor.replaceContent(content);
		}

		return emmet.run(name, editor);
	};

	it('should run "Encode/Decoder image to data:URL" action', function() {
		assert(run('encode_decode_data_url', '<img src="${0}e.gif" />'));
		assert.equal(editor.getContent(), '<img src="data:image/gif;base64,R0lGODdhAQABAIAAAAAAAAAAACH5BAEAAAEALAAAAAABAAEAAAICTAEAOw==" />');
	});

	it('should run "Next/Previous Edit Point" action', function() {
		assert(run('next_edit_point', '<a href="" ${0}title=""></a>'));
		assert.equal(editor.getCaretPos(), 18);

		assert(run('prev_edit_point'));
		assert.equal(editor.getCaretPos(), 9);
	});

	it('should run "Evaluate Math Expression" action', function() {
		assert(run('evaluate_math_expression', 'hello 2+4${0} world'));
		assert.equal(editor.getContent(), 'hello 6 world');
	});

	it('should run "Expand Abbreviation" action', function() {
		assert(run('expand_abbreviation', 'str*3${0}'));
		assert.equal(editor.getContent(), '<strong></strong>\n<strong></strong>\n<strong></strong>');

		assert(!run('expand_abbreviation', 'div ${0}'));
		assert.equal(editor.getContent(), 'div ');

		assert(run('expand_abbreviation_with_tab', 'div${0}'));
		assert.equal(editor.getContent(), '<div></div>');

		assert(run('expand_abbreviation_with_tab', '${0}div'));
		assert.equal(editor.getContent(), '\tdiv');
	});

	it('should run "Insert Formatted Line Break" action', function() {
		assert(run('insert_formatted_line_break', '<a>${0}</a>'));
		assert.equal(editor.getContent(), '<a>\n\t\n</a>');

		assert(run('insert_formatted_line_break'));
		assert.equal(editor.getContent(), '<a>\n\t\n\t\n</a>');
	});

	it('should run "Balance" action', function() {
		assert(run('balance_outward', '<i><b>${0}</b></i>'));
		assert.equal(editor.getSelection(), '<b></b>');

		assert(run('balance_outward'));
		assert.equal(editor.getSelection(), '<i><b></b></i>');

		assert(run('balance_inward'));
		assert.equal(editor.getSelection(), '<b></b>');
	});

	it('should run "Go to Matching Pair" action', function() {
		assert(run('matching_pair', 'a <b></b${0}> c'));
		assert.equal(editor.getCaretPos(), 2);
	});

	it('should run "Merge Lines" action', function() {
		assert(run('merge_lines', '<b>\n\n${0}\n\n</b>'));
		assert.equal(editor.getContent(), '<b></b>');
	});

	it('should run "Reflect CSS Value" action', function() {
		editor.setSyntax('css');

		assert(run('reflect_css_value', 'a {p:1; -a-p:12${0}; -b-p:1; x:1;}'));
		assert.equal(editor.getContent(), 'a {p:12; -a-p:12; -b-p:12; x:1;}');

		editor.setSyntax('html');
	});

	it('should run "Remove Tag" action', function() {
		assert(run('remove_tag', 'hello <b><${0}i>world</i></b>'));
		assert.equal(editor.getContent(), 'hello <b>world</b>');
	});

	it('should run "Select Next/Previous Item" action', function() {
		assert(run('select_next_item', '${0}hello <b title="sample">world</b>'));
		assert.equal(editor.getSelection(), 'b');

		assert(run('select_next_item'));
		assert.equal(editor.getSelection(), 'title="sample"');

		assert(run('select_previous_item'));
		assert.equal(editor.getSelection(), 'b');
	});

	it('should run "Split/Join Tag" action', function() {
		assert(run('split_join_tag', 'hello <b${0}>world</b>'));
		assert.equal(editor.getContent(), 'hello <b />');

		assert(run('split_join_tag'));
		assert.equal(editor.getContent(), 'hello <b></b>');
	});

	it('should run "Toggle Comment" action', function() {
		assert(run('toggle_comment', 'hello <b${0}>world</b>'));
		assert.equal(editor.getContent(), 'hello <!-- <b>world</b> -->');

		assert(run('toggle_comment'));
		assert.equal(editor.getContent(), 'hello <b>world</b>');
	});

	it('should run "Update Image Size" action', function() {
		assert(run('update_image_size', '<img src="${0}e.gif" />'));
		assert.equal(editor.getContent(), '<img src="e.gif" width="1" height="1" />');
	});

	it('should run "Wrap With Abbreviation" action', function() {
		editor.setPromptOutput('ul>li');
		assert(run('wrap_with_abbreviation', '<br${0} />'));
		assert.equal(editor.getContent(), '<ul>\n\t<li>\n\t\t<br />\n\t</li>\n</ul>');
	});
});