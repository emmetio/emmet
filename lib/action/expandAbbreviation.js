/**
 * 'Expand abbreviation' editor action: extracts abbreviation from current caret 
 * position and replaces it with formatted output. 
 * <br><br>
 * This behavior can be overridden with custom handlers which can perform 
 * different actions when 'Expand Abbreviation' action is called.
 * For example, a CSS gradient handler that produces vendor-prefixed gradient
 * definitions registers its own expand abbreviation handler.  
 */
if (typeof module === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		module.exports = factory(require, exports, module);
	};
}

define(function(require, exports, module) {
	var _ = require('lodash');
	var handlerList = require('../assets/handlerList');
	var actions = require('./base');
	var range = require('../assets/range');
	var resources = require('../assets/resources');
	var editorUtils = require('../utils/editor');
	var actionUtils = require('../utils/action');
	var cssGradient = require('../resolver/cssGradient');

	/**
	 * @type HandlerList List of registered handlers
	 */
	var handlers = handlerList.create();
	
	/**
	 * 'Expand abbreviation' editor action 
	 * @param {IEmmetEditor} editor Editor instance
	 * @param {String} syntax Syntax type (html, css, etc.)
	 * @param {String} profile Output profile name (html, xml, xhtml)
	 * @return {Boolean} Returns <code>true</code> if abbreviation was expanded 
	 * successfully
	 */
	actions.add('expand_abbreviation', function(editor, syntax, profile) {
		var args = _.toArray(arguments);
		
		// normalize incoming arguments
		var info = editorUtils.outputInfo(editor, syntax, profile);
		args[1] = info.syntax;
		args[2] = info.profile;
		
		return handlers.exec(false, args);
	});
	
	/**
	 * A special version of <code>expandAbbreviation</code> function: if it can't
	 * find abbreviation, it will place Tab character at caret position
	 * @param {IEmmetEditor} editor Editor instance
	 * @param {String} syntax Syntax type (html, css, etc.)
	 * @param {String} profile Output profile name (html, xml, xhtml)
	 */
	actions.add('expand_abbreviation_with_tab', function(editor, syntax, profile) {
		var sel = editor.getSelection();
		var indent = resources.getVariable('indentation');
		if (sel) {
			// indent selection
			var selRange = range(editor.getSelectionRange());
			var content = utils.padString(sel, indent);
			
			editor.replaceContent(indent + '${0}', editor.getCaretPos());
			var replaceRange = range(editor.getCaretPos(), selRange.length());
			editor.replaceContent(content, replaceRange.start, replaceRange.end, true);
			editor.createSelection(replaceRange.start, replaceRange.start + content.length);
			return true;
		}
		
		if (!actions.run('expand_abbreviation', editor, syntax, profile)) {
			editor.replaceContent(indent, editor.getCaretPos());
		}
		
		return true;
	}, {hidden: true});
	
	// XXX setup default handler
	/**
	 * Extracts abbreviation from current caret 
	 * position and replaces it with formatted output 
	 * @param {IEmmetEditor} editor Editor instance
	 * @param {String} syntax Syntax type (html, css, etc.)
	 * @param {String} profile Output profile name (html, xml, xhtml)
	 * @return {Boolean} Returns <code>true</code> if abbreviation was expanded 
	 * successfully
	 */
	handlers.add(function(editor, syntax, profile) {
		var caretPos = editor.getSelectionRange().end;
		var abbr = module.exports.findAbbreviation(editor);
			
		if (abbr) {
			var content = emmet.expandAbbreviation(abbr, syntax, profile, 
					actionUtils.captureContext(editor));
			if (content) {
				editor.replaceContent(content, caretPos - abbr.length, caretPos);
				return true;
			}
		}
		
		return false;
	}, {order: -1});

	handlers.add(_.bind(cssGradient.expandAbbreviationHandler, cssGradient));

	module = module || {};
	module.exports = {
		/**
		 * Adds custom expand abbreviation handler. The passed function should 
		 * return <code>true</code> if it was performed successfully, 
		 * <code>false</code> otherwise.
		 * 
		 * Added handlers will be called when 'Expand Abbreviation' is called
		 * in order they were added
		 * @memberOf expandAbbreviation
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
			handlers.remove(fn);
		},
		
		/**
		 * Search for abbreviation in editor from current caret position
		 * @param {IEmmetEditor} editor Editor instance
		 * @return {String}
		 */
		findAbbreviation: function(editor) {
			/** @type Range */
			var range = range(editor.getSelectionRange());
			var content = String(editor.getContent());
			if (range.length()) {
				// abbreviation is selected by user
				return range.substring(content);
			}
			
			// search for new abbreviation from current caret position
			var curLine = editor.getCurrentLineRange();
			return actionUtils.extractAbbreviation(content.substring(curLine.start, range.start));
		}
	};
	
	return module.exports;
});