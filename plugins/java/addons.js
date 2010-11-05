/**
 * Short-hand functions for Java wrapper
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
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
	delete zen_coding.user_resources;
	zen_coding.user_resources = {};
}

/**
 * Adds user defined resource (abbreviation or snippet)
 * @param {String} syntax
 * @param {String} type
 * @param {String} abbr
 * @param {String} value
 */
function addUserResource(syntax, type, abbr, value) {
	var storage = zen_coding.user_resources;
	if (!(syntax in storage))
		storage[syntax] = {};
		
	if (!(type in storage[syntax])) {
		storage[syntax][type] = {};
	}
	
	var obj = storage[syntax][type];
	
	if (type == 'abbreviations') {
		obj[abbr] = zen_coding.settings_parser.parseAbbreviation(abbr, value);
		obj[abbr].__ref = value;
	} else {
		obj[abbr] = value;
	}
}

function hasZenCodingVariable(name) {
	return !!zen_coding.getVariable(name);
}


function tryBoolean(val) {
	var str_val = String(val).toLowerCase();
	if (str_val == 'true')
		return true;
	if (str_val == 'false')
		return false;
	
	return val;
}

function setupOutputProfile(name, profile_obj) {
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
	
	var profile = {}, val;
	for (var p in map) if (map.hasOwnProperty(p)) {
		val = profile_obj[map[p]]();
		if (val !== '' && val !== null)
			profile[p] = tryBoolean(val);
	}
	
	zen_coding.setupProfile(name, profile);
}