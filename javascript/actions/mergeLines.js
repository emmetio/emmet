/**
 * Merges selected lines or lines between XHTML tag pairs
 * @param {Function} require
 * @param {Underscore} _
 */
emmet.exec(function(require, _) {
	require('actions').add('merge_lines', function(editor) {
		var matcher = require('htmlMatcher');
		var utils = require('utils');
		var editorUtils = require('editorUtils');
		var info = editorUtils.outputInfo(editor);
		
		/** @type Range */
		var selection = require('range').create(editor.getSelectionRange());
		if (!selection.length()) {
			// find matching tag
			var pair = matcher.find(info.content, editor.getCaretPos());
			if (pair) {
				selection = pair.outerRange;
			}
		}
		
		if (selection.length()) {
			// got range, merge lines
			var text =  selection.substring(info.content);
			var lines = utils.splitByLines(text);
			
			for (var i = 1; i < lines.length; i++) {
				lines[i] = lines[i].replace(/^\s+/, '');
			}
			
			text = lines.join('').replace(/\s{2,}/, ' ');
			var textLen = text.length;
			text = utils.escapeText(text);
			editor.replaceContent(text, selection.start, selection.end);
			editor.createSelection(selection.start, selection.start + textLen);
			
			return true;
		}
		
		return false;
	});
});