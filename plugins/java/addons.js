/**
 * Short-hand functions for Java wrapper
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * 
 * @include "../../javascript/zen_resources.js"
 */

/**
 * Runs Zen Coding action
 * @param {ZenEditor} editor
 * @param {String} action_name
 * @return {Boolean}
 */function runZenCodingAction(editor, action_name){
	var args = [editor];
	for (var i = 2, il = arguments.length; i < il; i++) {
		args.push(arguments[i]);
	}
	
	return zen_coding.require('actions').run(action_name, args);
}

/**
 * Removes all user defined settings
 */
function resetUserSettings() {
	zen_coding.require('resources').setVocabulary({}, 'user');
}

/**
 * Adds user defined resource (abbreviation or snippet)
 * @param {String} syntax
 * @param {String} type
 * @param {String} abbr
 * @param {String} value
 */
function addUserResource(syntax, type, abbr, value) {
	var res = zen_coding.require('resources');
	var voc = res.getVocabulary('user') || {};
	if (!(syntax in voc))
		voc[syntax] = {};
		
	if (!(type in voc[syntax]))
		voc[syntax][type] = {};
		
	voc[syntax][type][abbr] = value;
	
	res.setVocabulary(voc, 'user');
}

function hasZenCodingVariable(name) {
	return !!zen_coding.require('resources').getVariable(name);
}

function tryBoolean(val) {
	var str_val = String(val || '').toLowerCase();
	if (str_val == 'true')
		return true;
	if (str_val == 'false')
		return false;
		
	var int_val = parseInt(str_val, 10);
	if (!isNaN(int_val))
		return int_val;
	
	return str_val;
}

function setupOutputProfile(name, profile_obj, editor) {
	var map = {
		tag_case: 'getTagCase',
		attr_case: 'getAttrCase',
		attr_quotes: 'getAttrQuotes',
		tag_nl: 'getTagNewline',
		place_cursor: 'isPlaceCaret',
		indent: 'isIndentTags',
		inline_break: 'getInlineBreak',
		self_closing_tag: 'getSelfClosing',
		filters: 'getFilters'
	};
	
	name = String(name);
	
	var profile = {};
		
	for (var p in map) if (map.hasOwnProperty(p)) {
		profile[p] = tryBoolean(profile_obj[map[p]]());
	}
	
	zen_coding.require('profile').create(name, profile);
}

function addUserVariable(name, value) {
	zen_coding.require('resources').setVariable(name, value);
}

function previewWrapWithAbbreviation(editor, abbr) {
	var syntax = String(editor.getSyntax());
	var profileName = String(editor.getProfileName());
	abbr = String(abbr);
	
	var range = editor.getSelectionRange(),
		startOffset = range.start,
		endOffset = range.end,
		content = String(editor.getContent());
		
		
	if (!abbr)
		return null;
	
	var editorUtils = zen_coding.require('editorUtils');
	var utils = zen_coding.require('utils');
	
	if (startOffset == endOffset) {
		// no selection, find tag pair
		range = zen_coding.require('html_matcher')(content, startOffset, profileName);
		
		if (!range || range[0] == -1) // nothing to wrap
			return null;
		
		var narrowedSel = editorUtils.narrowToNonSpace(content, range[0], range[1]);
		startOffset = narrowedSel[0];
		endOffset = narrowedSel[1];
	}
	
	var wrapAction = zen_coding.require('actions').get('wrap_with_abbreviation');
	var result = null;
	if (wrapAction) {
		
		var newContent = utils.escapeText(content.substring(startOffset, endOffset));
		result = wrapAction.fn.wrap(abbr, editorUtils.unindent(editor, newContent), syntax, profileName);
	}
	
	return result || null;
}
