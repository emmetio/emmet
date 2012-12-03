/**
 * Gracefully removes tag under cursor
 * 
 * @param {Function} require
 * @param {Underscore} _ 
 */
emmet.exec(function(require, _) {
	require('actions').add('remove_tag', function(editor) {
		var utils = require('utils');
		var info = require('editorUtils').outputInfo(editor);
		
		// search for tag
		var tag = require('htmlMatcher').tag(info.content, editor.getCaretPos());
		if (tag) {
			if (!tag.close) {
				// simply remove unary tag
				editor.replaceContent(utils.getCaretPlaceholder(), tag.range.start, tag.range.end);
			} else {
				// remove tag and its newlines
				/** @type Range */
				var tagContentRange = utils.narrowToNonSpace(info.content, tag.innerRange);
				/** @type Range */
				var startLineBounds = utils.findNewlineBounds(info.content, tagContentRange.start);
				var startLinePad = utils.getLinePadding(startLineBounds.substring(info.content));
				var tagContent = tagContentRange.substring(info.content);
				
				tagContent = utils.unindentString(tagContent, startLinePad);
				editor.replaceContent(utils.getCaretPlaceholder() + utils.escapeText(tagContent), tag.outerRange.start, tag.outerRange.end);
			}
			
			return true;
		}
		
		return false;
	}, {label: 'HTML/Remove Tag'});
});
