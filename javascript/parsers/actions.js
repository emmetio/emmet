/**
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * 
 * @include "../zen_editor.js"
 * @include "parserutils.js"
 * @include "../zen_coding.js"
 */
 
/**
 * Reflect CSS value: takes rule's value under caret pastes it for the same rules
 * with verdor prefixes
 * @param {zen_editor} editor
 */
function reflectCSSValue(editor) {
	if (editor.getSyntax() != 'css') return false;
	
	var content = String(editor.getContent()),
		caret_pos = editor.getCaretPos(),
		sel = editor.getSelectionRange(),
		css = ParserUtils.extractCSSRule(content, caret_pos);
		
	if (!css || caret_pos < css[0] || caret_pos > css[1])
		// no matching CSS rule or caret outside rule bounds
		return false;
		
	var tokens = ParserUtils.parseCSS(content.substring(css[0], css[1]), css[0]),
		token_ix = findTokenFromPosition(tokens, caret_pos, 'identifier');
	
	if (token_ix != -1) {
		var cur_prop = tokens[token_ix].content,
			value_token = findValueToken(tokens, token_ix + 1),
			base_name = cur_prop.replace(/^\s*\-\w+\-/, ''),
			re_name = new RegExp('^(?:\\-\\w+\\-)?' + base_name + '$'),
			values = [];
			
		if (!value_token) return false;
			
		// search for all vendor-prefixed properties
		for (var i = 0, token, il = tokens.length; i < il; i++) {
			token = tokens[i];
			if (token.type == 'identifier' && re_name.test(token.content) && token.content != cur_prop) {
				var v = findValueToken(tokens, i + 1);
				if (v) 
					values.push(v);
			}
		}
		
		// some editors do not provide easy way to replace multiple code 
		// fragments so we have to squash all replace operations into one
		if (values.length) {
			var data = content.substring(values[0].start, values[values.length - 1].end),
				offset = values[0].start,
				value = value_token.content;
				
			for (var i = values.length - 1; i >= 0; i--) {
				data = replaceSubstring(data, values[i].start - offset, values[i].end - offset, value);
				// also calculate new caret position
				if (values[i].start < caret_pos) {
					caret_pos += value.length - values[i].end + values[i].start;
				}
			}
			
			editor.replaceContent(data, offset, values[values.length - 1].end, true);
			editor.createSelection(caret_pos, caret_pos + sel.end - sel.start);
			
			return true;
		}
	}
	
	return false;
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