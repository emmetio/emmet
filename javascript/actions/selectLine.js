/**
 * Select current line (for simple editors like browser's &lt;textarea&gt;)
 */
zen_coding.require('actions').add('select_line', function(editor) {
	var range = editor.getCurrentLineRange();
	editor.createSelection(range.start, range.end);
	return true;
});