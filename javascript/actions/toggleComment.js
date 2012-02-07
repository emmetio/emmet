/**
 * Toggles HTML and CSS comments depending on current caret context
 */
(function() {
	var actions = zen_coding.require('actions');
	var matcher = zen_coding.require('html_matcher');
	var utils = zen_coding.require('utils');
	var editorUtils = zen_coding.require('editorUtils');
	
	/**
	 * Toggle comment on current editor's selection or HTML tag/CSS rule
	 * @param {IZenEditor} editor
	 */
	actions.add('toggle_comment', function(editor) {
		var info = editorUtils.outputInfo(editor);
		if (info.syntax == 'css') {
			// in case out editor is good enough and can recognize syntax from 
			// current token, we have to make sure that cursor is not inside
			// 'style' attribute of html element
			var caretPos = editor.getCaretPos();
			var pair = matcher.getTags(info.content, caretPos);
			if (pair && pair[0] && pair[0].type == 'tag' && 
					pair[0].start <= caretPos && pair[0].end >= caretPos) {
				info.syntax = 'html';
			}
		}
		
		if (info.syntax == 'css')
			return toggleCSSComment(editor);
		
		return toggleHTMLComment(editor);
	});

	/**
	 * Toggle HTML comment on current selection or tag
	 * @param {zen_editor} editor
	 * @return {Boolean} Returns <code>true</code> if comment was toggled
	 */
	function toggleHTMLComment(editor) {
		var rng = editor.getSelectionRange();
		var info = editorUtils.outputInfo(editor);
			
		if (rng.start == rng.end) {
			// no selection, find matching tag
			var pair = matcher.getTags(info.content, editor.getCaretPos(), info.profile);
			if (pair && pair[0]) { // found pair
				rng.start = pair[0].start;
				rng.end = pair[1] ? pair[1].end : pair[0].end;
			}
		}
		
		return genericCommentToggle(editor, '<!--', '-->', rng.start, rng.end);
	}

	/**
	 * Simple CSS commenting
	 * @param {zen_editor} editor
	 * @return {Boolean} Returns <code>true</code> if comment was toggled
	 */
	function toggleCSSComment(editor) {
		var rng = editor.getSelectionRange();
			
		if (rng.start == rng.end) {
			// no selection, get current line
			rng = editor.getCurrentLineRange();

			// adjust start index till first non-space character
			var _r = editorUtils.narrowToNonSpace(String(editor.getContent()), rng.start, rng.end);
			rng.start = _r[0];
			rng.end = _r[1];
		}
		
		return genericCommentToggle(editor, '/*', '*/', rng.start, rng.end);
	}

	/**
	 * Search for nearest comment in <code>str</code>, starting from index <code>from</code>
	 * @param {String} text Where to search
	 * @param {Number} from Search start index
	 * @param {String} start_token Comment start string
	 * @param {String} end_token Comment end string
	 * @return {Array|null} Returns null if comment wasn't found
	 */
	function searchComment(text, from, start_token, end_token) {
		var start_ch = start_token.charAt(0);
		var end_ch = end_token.charAt(0);
		var commentStart = -1;
		var commentEnd = -1;
		
		function hasMatch(str, start) {
			return text.substr(start, str.length) == str;
		}
			
		// search for comment start
		while (from--) {
			if (text.charAt(from) == start_ch && hasMatch(start_token, from)) {
				commentStart = from;
				break;
			}
		}
		
		if (commentStart != -1) {
			// search for comment end
			from = commentStart;
			var contentLen = text.length;
			while (contentLen >= from++) {
				if (text.charAt(from) == end_ch && hasMatch(end_token, from)) {
					commentEnd = from + end_token.length;
					break;
				}
			}
		}
		
		return (commentStart != -1 && commentEnd != -1) 
			? [commentStart, commentEnd] 
			: null;
	}

	/**
	 * Generic comment toggling routine
	 * @param {zen_editor} editor
	 * @param {String} commentStart Comment start token
	 * @param {String} commentEnd Comment end token
	 * @param {Number} rangeStart Start selection range
	 * @param {Number} rangeEnd End selection range
	 * @return {Boolean}
	 */
	function genericCommentToggle(editor, commentStart, commentEnd, rangeStart, rangeEnd) {
		var content = String(editor.getContent());
		var caretPos = editor.getCaretPos();
		var newContent = null;
			
		/**
		 * Remove comment markers from string
		 * @param {Sting} str
		 * @return {String}
		 */
		function removeComment(str) {
			return str
				.replace(new RegExp('^' + utils.escapeForRegexp(commentStart) + '\\s*'), function(str){
					caretPos -= str.length;
					return '';
				}).replace(new RegExp('\\s*' + utils.escapeForRegexp(commentEnd) + '$'), '');
		}
		
		function hasMatch(str, start) {
			return content.substr(start, str.length) == str;
		}
			
		// first, we need to make sure that this substring is not inside 
		// comment
		var commentRange = searchComment(content, caretPos, commentStart, commentEnd);
		
		if (commentRange && commentRange[0] <= rangeStart && commentRange[1] >= rangeEnd) {
			// we're inside comment, remove it
			rangeStart = commentRange[0];
			rangeEnd = commentRange[1];
			
			newContent = removeComment(content.substring(rangeStart, rangeEnd));
		} else {
			// should add comment
			// make sure that there's no comment inside selection
			newContent = commentStart + ' ' + 
				content.substring(rangeStart, rangeEnd)
					.replace(new RegExp(utils.escapeForRegexp(commentStart) + '\\s*|\\s*' + utils.escapeForRegexp(commentEnd), 'g'), '') +
				' ' + commentEnd;
				
			// adjust caret position
			caretPos += commentStart.length + 1;
		}

		// replace editor content
		if (newContent !== null) {
			editor.setCaretPos(rangeStart);
			editor.replaceContent(editorUtils.unindent(editor, newContent), rangeStart, rangeEnd);
			editor.setCaretPos(caretPos);
			return true;
		}
		
		return false;
	}
})();