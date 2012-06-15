/**
 * Gracefully removes tag under cursor
 * 
 * @param {Function} require
 * @param {Underscore} _ 
 */
zen_coding.exec(function(require, _) {
	require('actions').add('remove_tag', function(editor) {
		var utils = require('utils');
		var info = require('editorUtils').outputInfo(editor);
		
		// search for tag
		var pair = require('html_matcher').getTags(info.content, editor.getCaretPos(), info.profile);
		if (pair && pair[0]) {
			if (!pair[1]) {
				// simply remove unary tag
				editor.replaceContent(utils.getCaretPlaceholder(), pair[0].start, pair[0].end);
			} else {
				// remove tag and its newlines
				/** @type Range */
				var tagContentRange = utils.narrowToNonSpace(info.content, pair[0].end, pair[1].start - pair[0].end);
				/** @type Range */
				var startLineBounds = utils.findNewlineBounds(info.content, tagContentRange.start);
				var startLinePad = utils.getLinePadding(startLineBounds.substring(info.content));
				var tagContent = tagContentRange.substring(info.content);
				
				tagContent = utils.unindentString(tagContent, startLinePad);
				editor.replaceContent(utils.getCaretPlaceholder() + tagContent, pair[0].start, pair[1].end);
			}
			
			return true;
		}
		
		return false;
	}, {label: 'HTML/Remove Tag'});
});
