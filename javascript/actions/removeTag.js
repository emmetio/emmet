/**
 * Gracefully removes tag under cursor
 * @param {IZenEditor} editor
 */
zen_coding.require('actions').add('remove_tag', function(editor) {
	var utils = zen_coding.require('utils');
	var actionUtils = zen_coding.require('actionUtils');
	var editorUtils = zen_coding.require('editorUtils');
	var matcher = zen_coding.require('html_matcher');
	
	var info = zen_coding.require('editorUtils').outputInfo(editor);
	var caretPos = editor.getCaretPos();
		
	// search for tag
	var pair = matcher.getTags(info.content, caretPos, info.profile);
	if (pair && pair[0]) {
		if (!pair[1]) {
			// simply remove unary tag
			editor.replaceContent(utils.getCaretPlaceholder(), pair[0].start, pair[0].end);
		} else {
			var tagContentRange = editorUtils.narrowToNonSpace(info.content, pair[0].end, pair[1].start);
			var startLineBounds = actionUtils.getLineBounds(info.content, tagContentRange[0]);
			var startLinePad = utils.getLinePadding(info.content.substring(startLineBounds.start, startLineBounds.end));
			var tagContent = info.content.substring(tagContentRange[0], tagContentRange[1]);
				
			tagContent = utils.unindentString(tagContent, startLinePad);
			editor.replaceContent(utils.getCaretPlaceholder() + tagContent, pair[0].start, pair[1].end);
		}
		
		return true;
	}
	
	return false;
});
