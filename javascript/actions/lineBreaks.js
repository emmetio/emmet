/**
 * Actions to insert line breaks. Some simple editors (like browser's 
 * &lt;textarea&gt;, for example) do not provide such simple things
 * @param {Function} require
 * @param {Underscore} _
 */
emmet.exec(function(require, _) {
	var actions = require('actions');
	/** @type emmet.preferences */
	var prefs = require('preferences');
	
	// setup default preferences
	prefs.define('css.closeBraceIndentation', '\n',
			'Indentation before closing brace of CSS rule. Some users prefere ' 
			+ 'indented closing brace of CSS rule for better readability. '
			+ 'This preference’s value will be automatically inserted before '
			+ 'closing brace when user adds newline in newly created CSS rule '
			+ '(e.g. when “Insert formatted linebreak” action will be performed ' 
			+ 'in CSS file). If you’re such user, you may want to write put a value ' 
			+ 'like <code>\\n\\t</code> in this preference.');
	
	/**
	 * Inserts newline character with proper indentation in specific positions only.
	 * @param {IEmmetEditor} editor
	 * @return {Boolean} Returns <code>true</code> if line break was inserted 
	 */
	actions.add('insert_formatted_line_break_only', function(editor) {
		var utils = require('utils');
		/** @type emmet.resources */
		var res = require('resources');
		
		var info = require('editorUtils').outputInfo(editor);
		var caretPos = editor.getCaretPos();
		var nl = utils.getNewline();
		var pad;
		
		if (_.include(['html', 'xml', 'xsl'], info.syntax)) {
			pad = res.getVariable('indentation');
			// let's see if we're breaking newly created tag
			var tag = require('htmlMatcher').tag(info.content, caretPos);
			if (tag && !tag.innerRange.length()) {
				editor.replaceContent(nl + pad + utils.getCaretPlaceholder() + nl, caretPos);
				return true;
			}
		} else if (info.syntax == 'css') {
			/** @type String */
			var content = info.content;
			if (caretPos && content.charAt(caretPos - 1) == '{') {
				var append = prefs.get('css.closeBraceIndentation');
				pad = res.getVariable('indentation');
				
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
	}, {hidden: true});
	
	/**
	 * Inserts newline character with proper indentation. This action is used in
	 * editors that doesn't have indentation control (like textarea element) to 
	 * provide proper indentation
	 * @param {IEmmetEditor} editor Editor instance
	 */
	actions.add('insert_formatted_line_break', function(editor) {
		if (!actions.run('insert_formatted_line_break_only', editor)) {
			var utils = require('utils');
			
			var curPadding = require('editorUtils').getCurrentLinePadding(editor);
			var content = String(editor.getContent());
			var caretPos = editor.getCaretPos();
			var len = content.length;
			var nl = utils.getNewline();
				
			// check out next line padding
			var lineRange = editor.getCurrentLineRange();
			var nextPadding = '';
				
			for (var i = lineRange.end + 1, ch; i < len; i++) {
				ch = content.charAt(i);
				if (ch == ' ' || ch == '\t')
					nextPadding += ch;
				else
					break;
			}
			
			if (nextPadding.length > curPadding.length)
				editor.replaceContent(nl + nextPadding, caretPos, caretPos, true);
			else
				editor.replaceContent(nl, caretPos);
		}
		
		return true;
	}, {hidden: true});
});