/**
 * Action that wraps content with abbreviation. For convenience, action is 
 * defined as reusable module
 */
if (typeof module === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		module.exports = factory(require, exports, module);
	};
}

define(function(require, exports, module) {
	var _ = require('lodash');
	var actions = require('./base');
	var filters = require('../assets/filters');
	var profile = require('../assets/profile');
	var tabStops = require('../assets/tabStops');
	var range = require('../assets/range');
	var htmlMatcher = require('../assets/htmlMatcher');
	var utils = require('../utils/common');
	var editorUtils = require('../utils/editor');
	var actionUtils = require('../utils/action');
	var abbreviationParser = require('../parser/abbreviation');
	
	module = module || {};
	module.exports = {
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
		wrap: function(abbr, text, syntax, curProfile, contextNode) {
			syntax = syntax || emmet.defaultSyntax();
			curProfile = profile.get(curProfile, syntax);
			
			tabStops.resetTabstopIndex();
			
			var data = filters.extractFromAbbreviation(abbr);
			var parsedTree = abbreviationParser.parse(data[0], {
				syntax: syntax,
				pastedContent: text,
				contextNode: contextNode
			});
			if (parsedTree) {
				var filtersList = filters.composeList(syntax, curProfile, data[1]);
				filters.apply(parsedTree, filtersList, curProfile);
				return utils.replaceVariables(parsedTree.valueOf());
			}
			
			return null;
		}
	};
	
	/**
	 * Wraps content with abbreviation
	 * @param {IEmmetEditor} Editor instance
	 * @param {String} abbr Abbreviation to wrap with
	 * @param {String} syntax Syntax type (html, css, etc.)
	 * @param {String} profile Output profile name (html, xml, xhtml)
	 */
	actions.add('wrap_with_abbreviation', function (editor, abbr, syntax, profile) {
		var info = editorUtils.outputInfo(editor, syntax, profile);
		abbr = abbr || editor.prompt("Enter abbreviation");
		
		if (!abbr) 
			return null;
		
		abbr = String(abbr);
		
		var range = range(editor.getSelectionRange());
		
		if (!range.length()) {
			// no selection, find tag pair
			var match = htmlMatcher.tag(info.content, range.start);
			if (!match) {  // nothing to wrap
				return false;
			}
			
			range = utils.narrowToNonSpace(info.content, match.range);
		}
		
		var newContent = utils.escapeText(range.substring(info.content));
		var result = module.exports.wrap(abbr, editorUtils.unindent(editor, newContent), info.syntax, 
					info.profile, actionUtils.captureContext(editor));
		
		if (result) {
			editor.replaceContent(result, range.start, range.end);
			return true;
		}
		
		return false;
	});
});