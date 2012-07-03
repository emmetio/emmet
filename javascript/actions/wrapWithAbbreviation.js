/**
 * Action that wraps content with abbreviation. For convenience, action is 
 * defined as reusable module
 * @constructor
 * @memberOf __wrapWithAbbreviationDefine
 */
zen_coding.define('wrapWithAbbreviation', function(require, _) {
	/**
	 * Wraps content with abbreviation
	 * @param {IZenEditor} Editor instance
	 * @param {String} abbr Abbreviation to wrap with
	 * @param {String} syntax Syntax type (html, css, etc.)
	 * @param {String} profile Output profile name (html, xml, xhtml)
	 */
	require('actions').add('wrap_with_abbreviation', function (editor, abbr, syntax, profile) {
		var info = require('editorUtils').outputInfo(editor, syntax, profile);
		var utils = require('utils');
		/** @type zen_coding.editorUtils */
		var editorUtils = require('editorUtils');
		var matcher = require('html_matcher');
		
		abbr = abbr || editor.prompt("Enter abbreviation");
		
		if (!abbr) 
			return null;
		
		abbr = String(abbr);
		
		var range = editor.getSelectionRange();
		var startOffset = range.start;
		var endOffset = range.end;
		
		if (startOffset == endOffset) {
			// no selection, find tag pair
			range = matcher(info.content, startOffset, info.profile);
			
			if (!range || range[0] == -1) // nothing to wrap
				return false;
			
			/** @type Range */
			var narrowedSel = utils.narrowToNonSpace(info.content, range[0], range[1] - range[0]);
			startOffset = narrowedSel.start;
			endOffset = narrowedSel.end;
		}
		
		var newContent = utils.escapeText(info.content.substring(startOffset, endOffset));
		var result = require('wrapWithAbbreviation').wrap(abbr, editorUtils.unindent(editor, newContent), info.syntax, info.profile);
		
		if (result) {
//			editor.setCaretPos(endOffset);
			editor.replaceContent(result, startOffset, endOffset);
			return true;
		}
		
		return false;
	});
	
	return {
		/**
		 * Wraps passed text with abbreviation. Text will be placed inside last
		 * expanded element
		 * @memberOf zen_coding.wrapWithAbbreviation
		 * @param {String} abbr Abbreviation
		 * @param {String} text Text to wrap
		 * @param {String} syntax Document type (html, xml, etc.). Default is 'html'
		 * @param {String} profile Output profile's name. Default is 'plain'
		 * @return {String}
		 */
		wrap: function(abbr, text, syntax, profile) {
			/** @type zen_coding.filters */
			var filters = require('filters');
			/** @type zen_coding.utils */
			var utils = require('utils');
			
			syntax = syntax || zen_coding.defaultSyntax();
			profile = profile || zen_coding.defaultProfile();
			
			require('tabStops').resetTabstopIndex();
			
			var data = filters.extractFromAbbreviation(abbr);
			var parsedTree = require('abbreviationParser').parse(data[0], {
				syntax: syntax,
				pastedContent: text
			});
			if (parsedTree) {
				var filtersList = filters.composeList(syntax, profile, data[1]);
				filters.apply(parsedTree, filtersList, profile);
				return utils.replaceVariables(parsedTree.toString());
			}
			
			return null;
		}
	};
});