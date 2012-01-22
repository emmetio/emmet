/**
 * Actions to insert line breaks. Some simple editors (like browser's 
 * &lt;textarea&gt;, for example) do not provide such simple things
 */
(function() {
	var actions = zen_coding.require('actions');
	
	/**
	 * Inserts newline character with proper indentation in specific positions only.
	 * @param {IZenEditor} editor
	 * @return {Boolean} Returns <code>true</code> if line break was inserted 
	 */
	actions.add('insert_formatted_line_break_only', function(editor) {
		var utils = zen_coding.require('utils');
		/** @type zen_coding.editorUtils */
		var editorUtils = zen_coding.require('editorUtils');
		var matcher = zen_coding.require('html_matcher');
		/** @type zen_coding.resources */
		var res = zen_coding.require('resources');
		
		var info = editorUtils.outputInfo(editor);
		var caretPos = editor.getCaretPos();
		var nl = utils.getNewline();
		var pad = res.getVariable('indentation');
		
			
		if (info.syntax == 'html') {
			// let's see if we're breaking newly created tag
			var pair = matcher.getTags(info.content, caretPos, info.profile);
			
			if (pair[0] && pair[1] && pair[0].type == 'tag' && pair[0].end == caretPos && pair[1].start == caretPos) {
				editor.replaceContent(nl + pad + utils.getCaretPlaceholder() + nl, caretPos);
				return true;
			}
		} else if (info.syntax == 'css') {
			if (caretPos && info.content.charAt(caretPos - 1) == '{') {
				// look ahead for a closing brace
				for (var i = caretPos, il = info.content.length, ch; i < il; i++) {
					ch = info.content.charAt(i);
					if (ch == '}') return false;
					if (ch == '{') break;
				}
				
				// defining rule set
				var insValue = nl + pad + utils.getCaretPlaceholder() + nl;
				var hasCloseBrace = caretPos < info.content.length && info.content.charAt(caretPos) == '}';
					
				var userCloseBrace = res.getVariable('close_css_brace');
				if (userCloseBrace) {
					// user defined how close brace should look like
					insValue += utils.replaceVariables(userCloseBrace);
				} else if (!hasCloseBrace) {
					insValue += '}';
				}
				
				editor.replaceContent(insValue, caretPos, caretPos + (hasCloseBrace ? 1 : 0));
				return true;
			}
		}
			
		return false;
	});
	
	/**
	 * Inserts newline character with proper indentation. This action is used in
	 * editors that doesn't have indentation control (like textarea element) to 
	 * provide proper indentation
	 * @param {IZenEditor} editor Editor instance
	 */
	actions.add('insert_formatted_line_break', function(editor) {
		if (!actions.run('insert_formatted_line_break_only', editor)) {
			var editorUtils = zen_coding.require('editorUtils');
			var utils = zen_coding.require('utils');
			
			var curPadding = editorUtils.getCurrentLinePadding(editor);
			var content = String(editor.getContent());
			var caret_pos = editor.getCaretPos();
			var c_len = content.length;
			var nl = utils.getNewline();
				
			// check out next line padding
			var lineRange = editor.getCurrentLineRange();
			var nextPadding = '';
				
			for (var i = lineRange.end + 1, ch; i < c_len; i++) {
				ch = content.charAt(i);
				if (ch == ' ' || ch == '\t')
					nextPadding += ch;
				else
					break;
			}
			
			if (nextPadding.length > curPadding.length)
				editor.replaceContent(nl + nextPadding, caret_pos, caret_pos, true);
			else
				editor.replaceContent(nl, caret_pos);
		}
		
		return true;
	});
})();