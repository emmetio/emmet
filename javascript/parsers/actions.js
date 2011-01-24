/**
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * 
 * @include "../zen_editor.js"
 * @include "parserutils.js"
 * @include "../zen_coding.js"
 * @include "../zen_actions.js"
 */
 
/**
 * Reflect CSS value: takes rule's value under caret and pastes it for the same 
 * rules with vendor prefixes
 * @param {zen_editor} editor
 */
function reflectCSSValue(editor) {
	if (editor.getSyntax() != 'css') return false;
	
	var content = String(editor.getContent()),
		caret_pos = editor.getCaretPos(),
		sel = editor.getSelectionRange(),
		css = ParserUtils.extractCSSRule(content, caret_pos),
		v;
		
	if (!css || caret_pos < css[0] || caret_pos > css[1])
		// no matching CSS rule or caret outside rule bounds
		return false;
		
	var tokens = ParserUtils.parseCSS(content.substring(css[0], css[1]), css[0]),
		token_ix = findTokenFromPosition(tokens, caret_pos, 'identifier');
	
	if (token_ix != -1) {
		var cur_prop = tokens[token_ix].content,
			value_token = findValueToken(tokens, token_ix + 1),
			base_name = getBaseCSSName(cur_prop),
			re_name = new RegExp('^(?:\\-\\w+\\-)?' + base_name + '$'),
			re_name = getReflectedCSSName(base_name),
			values = [];
			
		if (!value_token) return false;
			
		// search for all vendor-prefixed properties
		for (var i = 0, token, il = tokens.length; i < il; i++) {
			token = tokens[i];
			if (token.type == 'identifier' && re_name.test(token.content) && token.content != cur_prop) {
				v = findValueToken(tokens, i + 1);
				if (v) 
					values.push({name: token, value: v});
			}
		}
		
		// some editors do not provide easy way to replace multiple code 
		// fragments so we have to squash all replace operations into one
		if (values.length) {
			var data = content.substring(values[0].value.start, values[values.length - 1].value.end),
				offset = values[0].value.start,
				value = value_token.content;
				
			for (var i = values.length - 1; i >= 0; i--) {
				v = values[i].value;
				data = replaceSubstring(data, v.start - offset, v.end - offset, 
					getReflectedValue(cur_prop, value, values[i].name.content, v.content));
					
				// also calculate new caret position
				if (v.start < caret_pos) {
					caret_pos += value.length - v.end + v.start;
				}
			}
			
			editor.replaceContent(unindent(editor, data), offset, values[values.length - 1].value.end);
			editor.createSelection(caret_pos, caret_pos + sel.end - sel.start);
			
			return true;
		}
	}
	
	return false;
}

/**
 * Removes vendor prefix from CSS property
 * @param {String} name CSS property
 * @return {String}
 */
function getBaseCSSName(name) {
	return name.replace(/^\s*\-\w+\-/, '');
}

/**
 * Returns regexp that should match reflected CSS property names
 * @param {String} name Current CSS property name
 * @return {RegExp}
 */
function getReflectedCSSName(name) {
	name = getBaseCSSName(name);
	var vendor_prefix = '^(?:\\-\\w+\\-)?', m;
	
	if (name == 'opacity' || name == 'filter') {
		return new RegExp(vendor_prefix + '(?:opacity|filter)$');
	} else if (m = name.match(/^border-radius-(top|bottom)(left|right)/)) {
		// Mozilla-style border radius
		return new RegExp(vendor_prefix + '(?:' + name + '|border-' + m[1] + '-' + m[2] + '-radius)$');
	} else if (m = name.match(/^border-(top|bottom)-(left|right)-radius/)) { 
		return new RegExp(vendor_prefix + '(?:' + name + '|border-radius-' + m[1] + m[2] + ')$');
	}
	
	return new RegExp(vendor_prefix + name + '$');
}

/**
 * Returns value that should be reflected for <code>ref_name</code> CSS property
 * from <code>cur_name</code> property. This function is used for special cases,
 * when the same result must be achieved with different properties for different
 * browsers. For example: opаcity:0.5; -> filter:alpha(opacity=50);<br><br>
 * 
 * This function does value conversion between different CSS properties
 * 
 * @param {String} cur_name Current CSS property name
 * @param {String} cur_value Current CSS property value
 * @param {String} ref_name Receiver CSS property's name 
 * @param {String} ref_value Receiver CSS property's value
 * @return {String} New value for receiver property
 */
function getReflectedValue(cur_name, cur_value, ref_name, ref_value) {
	cur_name = getBaseCSSName(cur_name);
	ref_name = getBaseCSSName(ref_name);
	
	if (cur_name == 'opacity' && ref_name == 'filter') {
		return ref_value.replace(/opacity=[^)]*/i, 'opacity=' + Math.floor(parseFloat(cur_value) * 100));
	} else if (cur_name == 'filter' && ref_name == 'opacity') {
		var m = cur_value.match(/opacity=([^)]*)/i);
		return m ? prettifyNumber(parseInt(m[1]) / 100) : ref_value;
	}
	
	return cur_value;
}

/**
 * Find value token, staring at <code>pos</code> index and moving right
 * @param {Array} tokens
 * @param {Number} pos
 * @return {ParserUtils.token}
 */
function findValueToken(tokens, pos) {
	for (var i = pos, il = tokens.length; i < il; i++) {
		var t = tokens[i];
		if (t.type == 'value')
			return t;
		else if (t.type == 'identifier' || t.type == ';')
			break;
	}
	
	return null;
}

/**
 * Replace substring of <code>text</code>, defined by <code>start</code> and 
 * <code>end</code> indexes with <code>new_value</code>
 * @param {String} text
 * @param {Number} start
 * @param {Number} end
 * @param {String} new_value
 * @return {String}
 */
function replaceSubstring(text, start, end, new_value) {
	return text.substring(0, start) + new_value + text.substring(end);
}

/**
 * Search for token with specified type left to the specified position
 * @param {Array} tokens List of parsed tokens
 * @param {Number} pos Position where to start searching
 * @param {String} type Token type
 * @return {Number} Token index
 */
function findTokenFromPosition(tokens, pos, type) {
	// find token under caret
	var token_ix = -1;
	for (var i = 0, il = tokens.length; i < il; i++) {
		var token = tokens[i];
		if (token.start <= pos && token.end >= pos) {
			token_ix = i;
			break;
		}
	}
	
	if (token_ix != -1) {
		// token found, search left until we find token with specified type
		while (token_ix >= 0) {
			if (tokens[token_ix].type == type)
				return token_ix;
			token_ix--;
		}
	}
	
	return -1;
}

zen_coding.registerAction('reflect_css_value', reflectCSSValue);