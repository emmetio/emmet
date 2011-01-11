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
	
	return zen_coding.runAction(action_name, args);
}

/**
 * Removes all user defined settings
 */
function resetUserSettings() {
	zen_resources.setVocabulary({}, 'user');
}

/**
 * Adds user defined resource (abbreviation or snippet)
 * @param {String} syntax
 * @param {String} type
 * @param {String} abbr
 * @param {String} value
 */
function addUserResource(syntax, type, abbr, value) {
	var voc = zen_resources.getVocabulary('user') || {};
	if (!(syntax in voc))
		voc[syntax] = {};
		
	if (!(type in voc[syntax]))
		voc[syntax][type] = {};
		
	voc[syntax][type][abbr] = value;
	
	zen_resources.setVocabulary(voc, 'user');
}

function hasZenCodingVariable(name) {
	return !!zen_coding.getVariable(name);
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
	
	var profile = {}, val;
		
	for (var p in map) if (map.hasOwnProperty(p)) {
		profile[p] = tryBoolean(profile_obj[map[p]]());
	}
	
	zen_coding.setupProfile(name, profile);
}

function addUserVariable(name, value) {
	zen_coding.setVariable(name, value);
}