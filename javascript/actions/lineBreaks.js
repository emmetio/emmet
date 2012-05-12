/**
 * Actions to insert line breaks. Some simple editors (like browser's 
 * &lt;textarea&gt;, for example) do not provide such simple things
 */
(function() {
	var actions = zen_coding.require('actions');
	/** @type zen_coding.preferences */
	var prefs = zen_coding.require('preferences');
	
	// setup default preferences
	prefs.set('css.closeBraceIndentation', '\n',
			'Indentation before closing brace of CSS rule. Some users prefere' 
			+ 'indented closing brace of CSS rule for better readability. '
			+ 'This preference’s value will be automatically inserted before '
			+ 'closing brace when user adds newline in newly created CSS rule '
			+ '(e.g. when “Insert formatted linebreak” action will be performed ' 
			+ 'in CSS file). If you’re such user, you may want to write put a value ' 
			+ 'like <code>\\n\\t</code> in this preference.');
	
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
		
			
		if (info.syntax == 'html') {
			var pad = res.getVariable('indentation');
			// let's see if we're breaking newly created tag
			var pair = matcher.getTags(info.content, caretPos, info.profile);
			
			if (pair[0] && pair[1] && pair[0].type == 'tag' && pair[0].end == caretPos && pair[1].start == caretPos) {
				editor.replaceContent(nl + pad + utils.getCaretPlaceholder() + nl, caretPos);
				return true;
			}
		} else if (info.syntax == 'css') {
			/** @type String */
			var content = info.content;
			if (caretPos && content.charAt(caretPos - 1) == '{') {
				var append = prefs.get('css.closeBraceIndentation');
				var pad = res.getVariable('indentation');
				
				var hasCloseBrace = content.charAt(caretPos) == '}';
				if (!hasCloseBrace) {
					// do we really need special formatting here?
					// check if this is really a newly created rule,
					// look ahead for a closing brace
					for (var i = caretPos, il = content.length, ch; i < il; i++) {
						ch = content.charAt(i);
						if (ch == '{') {
							// ok, this is a new rule without closing brace
							break;
						}
						
						if (ch == '}') {
							// not a new rule, just add indentation
							append = '';
							hasCloseBrace = true;
							break;
						}
					}
				}
				
				if (!hasCloseBrace) {
					append += '}';
				}
				
				// defining rule set
				var insValue = nl + pad + utils.getCaretPlaceholder() + append;
				editor.replaceContent(insValue, caretPos);
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