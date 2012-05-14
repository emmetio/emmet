/**
 * Merges selected lines or lines between XHTML tag pairs
 */
zen_coding.require('actions').add('merge_lines', function(editor) {
	var matcher = zen_coding.require('html_matcher');
	var utils = zen_coding.require('utils');
	var editorUtils = zen_coding.require('editorUtils');
	
	var info = editorUtils.outputInfo(editor);
	
	
	var selection = editor.getSelectionRange();
	if (selection.start == selection.end) {
		// find matching tag
		var pair = matcher(info.content, editor.getCaretPos(), info.profile);
		if (pair) {
			selection.start = pair[0];
			selection.end = pair[1];
		}
	}
	
	if (selection.start != selection.end) {
		// got range, merge lines
		var text = info.content.substring(selection.start, selection.end);
		var lines = utils.splitByLines(text);
		
		for (var i = 1; i < lines.length; i++) {
			lines[i] = lines[i].replace(/^\s+/, '');
		}
		
		text = lines.join('').replace(/\s{2,}/, ' ');
		editor.replaceContent(text, selection.start, selection.end);
		editor.createSelection(selection.start, selection.start + text.length);
		
		return true;
	}
	
	return false;
});