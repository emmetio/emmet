/**
 * Action that wraps content with abbreviation. For convenience, action is 
 * defined as reusable module
 * @constructor
 * @memberOf __wrapWithAbbreviationDefine
 */
emmet.define('wrapWithAbbreviation', function(require, _) {
	/** Back-references to current module */
	var module = null;
	
	/**
	 * Wraps content with abbreviation
	 * @param {IEmmetEditor} Editor instance
	 * @param {String} abbr Abbreviation to wrap with
	 * @param {String} syntax Syntax type (html, css, etc.)
	 * @param {String} profile Output profile name (html, xml, xhtml)
	 */
	require('actions').add('wrap_with_abbreviation', function (editor, abbr, syntax, profile) {
		var info = require('editorUtils').outputInfo(editor, syntax, profile);
		var utils = require('utils');
		/** @type emmet.editorUtils */
		var editorUtils = require('editorUtils');
		abbr = abbr || editor.prompt("Enter abbreviation");
		
		if (!abbr) 
			return null;
		
		abbr = String(abbr);
		
		var range = require('range').create(editor.getSelectionRange());
		
		if (!range.length()) {
			// no selection, find tag pair
			var match = require('htmlMatcher').tag(info.content, range.start);
			if (!match) {  // nothing to wrap
				return false;
			}
			
			range = utils.narrowToNonSpace(info.content, match.range);
		}
		
		var newContent = utils.escapeText(range.substring(info.content));
		var result = module
			.wrap(abbr, editorUtils.unindent(editor, newContent), info.syntax, 
					info.profile, require('actionUtils').captureContext(editor));
		
		if (result) {
			editor.replaceContent(result, range.start, range.end);
			return true;
		}
		
		return false;
	});
	
	return module = {
		/**
		 * Wraps passed text with abbreviation. Text will be placed inside last
		 * expanded element
		 * @memberOf wrapWithAbbreviation
		 * @param {String} abbr Abbreviation
		 * @param {String} text Text to wrap
		 * @param {String} syntax Document type (html, xml, etc.). Default is 'html'
		 * @param {String} profile Output profile's name. Default is 'plain'
		 * @param {Object} contextNode Context node inside which abbreviation
		 * is wrapped. It will be used as a reference for node name resolvers
		 * @return {String}
		 */
		wrap: function(abbr, text, syntax, profile, contextNode) {
			/** @type emmet.filters */
			var filters = require('filters');
			/** @type emmet.utils */
			var utils = require('utils');
			
			syntax = syntax || emmet.defaultSyntax();
			profile = require('profile').get(profile, syntax);
			
			require('tabStops').resetTabstopIndex();
			
			var data = filters.extractFromAbbreviation(abbr);
			var parsedTree = require('abbreviationParser').parse(data[0], {
				syntax: syntax,
				pastedContent: text,
				contextNode: contextNode
			});
			if (parsedTree) {
				var filtersList = filters.composeList(syntax, profile, data[1]);
				filters.apply(parsedTree, filtersList, profile);
				return utils.replaceVariables(parsedTree.valueOf());
			}
			
			return null;
		}
	};
});