/**
 * 'Expand abbreviation' editor action: extracts abbreviation from current caret 
* position and replaces it with formatted output
 * @constructor
 * @memberOf __expandAbbreviationActionDefine
 * @param {Function} require
 * @param {Underscore} _
 */
zen_coding.exec(function(require, _) {
	/**
	 * Search for abbreviation in editor from current caret position
	 * @param {IZenEditor} editor Editor instance
	 * @return {String}
	 */
	function findAbbreviation(editor) {
		/** @type Range */
		var range = require('range').create(editor.getSelectionRange());
		var content = String(editor.getContent());
		if (range.length()) {
			// abbreviation is selected by user
			return range.substring(content);
		}
		
		// search for new abbreviation from current caret position
		var curLine = editor.getCurrentLineRange();
		return require('actionUtils').extractAbbreviation(content.substring(curLine.start, range.start));
	}
	
	var actions = require('actions');
	/**
	 * 'Expand abbreviation' editor action: extracts abbreviation from current caret 
	 * position and replaces it with formatted output 
	 * @param {IZenEditor} editor Editor instance
	 * @param {String} syntax Syntax type (html, css, etc.)
	 * @param {String} profile Output profile name (html, xml, xhtml)
	 * @return {Boolean} Returns <code>true</code> if abbreviation was expanded 
	 * successfully
	 */
	actions.add('expand_abbreviation', function(editor, syntax, profile) {
		var info = require('editorUtils').outputInfo(editor, syntax, profile);
		var caretPos = editor.getSelectionRange().end;
		var abbr;
		var content = '';
			
		if ( (abbr = findAbbreviation(editor)) ) {
			content = zen_coding.expandAbbreviation(abbr, info.syntax, info.profile, 
					require('actionUtils').captureContext(editor));
			if (content) {
				editor.replaceContent(content, caretPos - abbr.length, caretPos);
				return true;
			}
		}
		
		return false;
	});
	
	/**
	 * A special version of <code>expandAbbreviation</code> function: if it can't
	 * find abbreviation, it will place Tab character at caret position
	 * @param {IZenEditor} editor Editor instance
	 * @param {String} syntax Syntax type (html, css, etc.)
	 * @param {String} profile Output profile name (html, xml, xhtml)
	 */
	actions.add('expand_abbreviation_with_tab', function(editor, syntax, profile) {
		if (!actions.run('expand_abbreviation', editor, syntax, profile))
			editor.replaceContent(require('resources').getVariable('indentation'), editor.getCaretPos());
	});
});