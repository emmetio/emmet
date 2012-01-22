(function() {
	var actions = zen_coding.require('actions');
	
	/**
	 * Search for abbreviation in editor from current caret position
	 * @param {IZenEditor} editor Editor instance
	 * @return {String}
	 */
	function findAbbreviation(editor) {
		var range = editor.getSelectionRange();
		var content = String(editor.getContent());
		if (range.start != range.end) {
			// abbreviation is selected by user
			return content.substring(range.start, range.end);
		}
		
		// search for new abbreviation from current caret position
		var curLine = editor.getCurrentLineRange();
		return zen_coding.require('actionUtils').extractAbbreviation(content.substring(curLine.start, range.start));
	}
	
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
		syntax = String(syntax || editor.getSyntax());
		profile = String(profile || editor.getProfileName());
		
		var caretPos = editor.getSelectionRange().end;
		var abbr;
		var content = '';
			
		if ( (abbr = findAbbreviation(editor)) ) {
			content = zen_coding.expandAbbreviation(abbr, syntax, profile, 
					zen_coding.require('actionUtils').captureContext(editor));
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
			editor.replaceContent(zen_coding.require('resources').getVariable('indentation'), editor.getCaretPos());
	});
})();