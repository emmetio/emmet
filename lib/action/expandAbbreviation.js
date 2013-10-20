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
	var range = require('../assets/range');
	var resources = require('../assets/resources');
	var editorUtils = require('../utils/editor');
	var actionUtils = require('../utils/action');
	var cssGradient = require('../resolver/cssGradient');
	var filters = require('../filter/main');
	var abbreviationParser = require('../parser/abbreviation');
	var profile = require('../assets/profile');
	var tabStops = require('../assets/tabStops');

	var DEFAULT_SYNTAX  = 'html';
	var DEFAULT_PROFILE = 'plain';

	/**
	 * @type HandlerList List of registered handlers
	 */
	var handlers = handlerList.create();
		
	module = module || {};
	module.exports = {
		/**
		 * Expands given abbreviation into a formatted code structure.
		 * This is the main method that is used for expanding abbreviation
		 * @param {String} abbr Abbreviation to expand
		 * @param {String} syntax Abbreviation's context syntax (optional)
		 * @param {String} profile Output profile or its name (optional)
		 * @param {AbbreviationNode} contextNode Contextual node where abbreviation is
		 * written (optional)
		 * @return {String}
		 */
		expandAbbreviation: function(abbr, syntax, profileName, contextNode) {
			if (!abbr) return '';
			
			syntax = syntax || DEFAULT_SYNTAX;
			
			profileName = profile.get(profileName, syntax);
			tabStops.resetTabstopIndex();
			
			var data = filters.extract(abbr);
			var outputTree = abbreviationParser.parse(data[0], {
				syntax: syntax, 
				contextNode: contextNode
			});

			var filtersList = filters.composeList(syntax, profileName, data[1]);
			filters.apply(outputTree, filtersList, profileName);

			return outputTree.valueOf();
		},

		/**
		 * The actual “Expand Abbreviation“ action routine
		 * @param  {IEmmetEditor} editor  Editor instance
		 * @param  {String} syntax  Current document syntax
		 * @param  {String} profile Output profile name
		 * @return {Boolean}
		 */
		expandAbbreviationAction: function(editor, syntax, profile) {
			var args = _.toArray(arguments);
			
			// normalize incoming arguments
			var info = editorUtils.outputInfo(editor, syntax, profile);
			args[1] = info.syntax;
			args[2] = info.profile;
			
			return handlers.exec(false, args);
		},

		/**
		 * A special case of “Expand Abbreviation“ action, invoked by Tab key.
		 * In this case if abbreviation wasn’t expanded successfully or there’s a selecetion, 
		 * the current line/selection will be indented. 
		 * @param  {IEmmetEditor} editor  Editor instance
		 * @param  {String} syntax  Current document syntax
		 * @param  {String} profile Output profile name
		 * @return {Boolean}
		 */
		expandAbbreviationWithTabAction: function(editor, syntax, profile) {
			var sel = editor.getSelection();
			var indent = resources.getVariable('indentation');

			// if something is selected in editor,
			// we should indent the selected content
			if (sel) {
				var selRange = range(editor.getSelectionRange());
				var content = utils.padString(sel, indent);
				
				editor.replaceContent(indent + '${0}', editor.getCaretPos());
				var replaceRange = range(editor.getCaretPos(), selRange.length());
				editor.replaceContent(content, replaceRange.start, replaceRange.end, true);
				editor.createSelection(replaceRange.start, replaceRange.start + content.length);
				return true;
			}
	
			// nothing selected, try to expand
			if (!this.expandAbbreviationAction(editor, syntax, profile)) {
				editor.replaceContent(indent, editor.getCaretPos());
			}
			
			return true;
		},

		/**
		 * Extracts abbreviation from current caret 
		 * position and replaces it with formatted output 
		 * @param {IEmmetEditor} editor Editor instance
		 * @param {String} syntax Syntax type (html, css, etc.)
		 * @param {String} profile Output profile name (html, xml, xhtml)
		 * @return {Boolean} Returns <code>true</code> if abbreviation was expanded 
		 * successfully
		 */
		_defaultHandler: function(editor, syntax, profile) {
			var caretPos = editor.getSelectionRange().end;
			var abbr = this.findAbbreviation(editor);
				
			if (abbr) {
				var ctx = actionUtils.captureContext(editor);
				var content = this.expandAbbreviation(abbr, syntax, profile, ctx);
				if (content) {
					editor.replaceContent(content, caretPos - abbr.length, caretPos);
					return true;
				}
			}
			
			return false;
		},

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
			var r = range(editor.getSelectionRange());
			var content = String(editor.getContent());
			if (r.length()) {
				// abbreviation is selected by user
				return r.substring(content);
			}
			
			// search for new abbreviation from current caret position
			var curLine = editor.getCurrentLineRange();
			return actionUtils.extractAbbreviation(content.substring(curLine.start, r.start));
		}
	};

	// XXX setup default expand handlers
	handlers.add(_.bind(module.exports._defaultHandler, module.exports), {order: -1});
	handlers.add(_.bind(cssGradient.expandAbbreviationHandler, cssGradient));
	
	return module.exports;
});