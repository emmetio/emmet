/**
 * Gracefully removes tag under cursor
 */
if (typeof module === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		module.exports = factory(require, exports, module);
	};
}

define(function(require, exports, module) {
	var actions = require('./base');
	var utils = require('../utils/common');
	var editorUtils = require('../utils/editor');
	var htmlMatcher = require('../assets/htmlMatcher');

	actions.add('remove_tag', function(editor) {
		var info = editorUtils.outputInfo(editor);
		
		// search for tag
		var tag = htmlMatcher.tag(info.content, editor.getCaretPos());
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
