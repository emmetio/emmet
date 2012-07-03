/**
 * 'Expand abbreviation' editor action: extracts abbreviation from current caret 
 * position and replaces it with formatted output. 
 * <br><br>
 * This behavior can be overridden with custom handlers which can perform 
 * different actions when 'Expand Abbreviation' action is called.
 * For example, a CSS gradient handler that produces vendor-prefixed gradient
 * definitions registers its own expand abbreviation handler.  
 *  
 * @constructor
 * @memberOf __expandAbbreviationActionDefine
 * @param {Function} require
 * @param {Underscore} _
 */
zen_coding.define('expandAbbreviation', function(require, _) {
	/**
	 * @type HandlerList List of registered handlers
	 */
	var handlers = require('handlerList').create();
	
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
	 * 'Expand abbreviation' editor action 
	 * @param {IZenEditor} editor Editor instance
	 * @param {String} syntax Syntax type (html, css, etc.)
	 * @param {String} profile Output profile name (html, xml, xhtml)
	 * @return {Boolean} Returns <code>true</code> if abbreviation was expanded 
	 * successfully
	 */
	actions.add('expand_abbreviation', function(editor, syntax, profile) {
		return handlers.exec(false, _.toArray(arguments));
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
	}, {hidden: true});
	
	// setup default handler
	/**
	 * Extracts abbreviation from current caret 
	 * position and replaces it with formatted output 
	 * @param {IZenEditor} editor Editor instance
	 * @param {String} syntax Syntax type (html, css, etc.)
	 * @param {String} profile Output profile name (html, xml, xhtml)
	 * @return {Boolean} Returns <code>true</code> if abbreviation was expanded 
	 * successfully
	 */
	handlers.add(function(editor, syntax, profile) {
		var info = require('editorUtils').outputInfo(editor, syntax, profile);
		var caretPos = editor.getSelectionRange().end;
		var content = '';
		var abbr = findAbbreviation(editor);
			
		if (abbr) {
			content = zen_coding.expandAbbreviation(abbr, info.syntax, info.profile, 
					require('actionUtils').captureContext(editor));
			if (content) {
				editor.replaceContent(content, caretPos - abbr.length, caretPos);
				return true;
			}
		}
		
		return false;
	}, {order: -1});
	
	return {
		/**
		 * Adds custom expand abbreviation handler. The passed function should 
		 * return <code>true</code> if it was performed successfully, 
		 * <code>false</code> otherwise.
		 * 
		 * Added handlers will be called when 'Expand Abbreviation' is called
		 * in order they were added
		 * @param {Function} fn
		 * @param {Object} options
		 */
		addHandler: function(fn, options) {
			handlers.add(fn, options);
		},
		
		/**
		 * Removes registered handler
		 * @returns
		 */
		removeHandler: function(fn) {
			handlers.remove(fn, options);
		}
	};
});