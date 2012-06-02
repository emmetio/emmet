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
			
			var narrowedSel = editorUtils.narrowToNonSpace(info.content, range[0], range[1]);
			startOffset = narrowedSel[0];
			endOffset = narrowedSel[1];
		}
		
		var newContent = utils.escapeText(info.content.substring(startOffset, endOffset));
		var result = require('wrapWithAbbreviation').wrap(abbr, editorUtils.unindent(editor, newContent), info.syntax, info.profile);
		
		if (result) {
			editor.setCaretPos(endOffset);
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
			/** @type zen_coding.transform */
			var transform = require('transform');
			
			var pasted = false;
			
			syntax = syntax || zen_coding.defaultSyntax();
			profile = profile || zen_coding.defaultProfile();
			
			var data = filters.extractFromAbbreviation(abbr);
			var parsedTree = transform.createParsedTree(data[0], syntax);
			if (parsedTree) {
				if (parsedTree.multiply_elem) {
					// we have a repeating element, put content in
					parsedTree.multiply_elem.setPasteContent(text);
					parsedTree.multiply_elem.repeat_by_lines = pasted = true;
				}
				
				var outputTree = transform.rolloutTree(parsedTree);
				if (!pasted) 
					outputTree.pasteContent(text);
				
				var filtersList = filters.composeList(syntax, profile, data[1]);
				filters.apply(outputTree, filtersList, profile);
				return utils.replaceVariables(outputTree.toString());
			}
			
			return null;
		}
	};
});