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
	
	return compoundUpdate(editor, doCSSReflection(editor));
}

function compoundUpdate(editor, data) {
	if (data) {
		var sel = editor.getSelectionRange();
		editor.replaceContent(data.data, data.start, data.end, true);
		editor.createSelection(data.caret, data.caret + sel.end - sel.start);
		return true;
	}
	
	return false;
}

/**
 * Update image size: reads image from image/CSS rule under caret
 * and updates dimentions inside tag/rule
 * @param {zen_editor} editor
 */
function updateImageSize(editor) {
	var result;
	if (String(editor.getSyntax()) == 'css') {
		result = updateImageSizeCSS(editor);
	} else {
		result = updateImageSizeHTML(editor);
	}
	
	return compoundUpdate(editor, result);
}

/**
 * Updates image size of &lt;img src=""&gt; tag
 * @param {zen_editor} editor
 */
function updateImageSizeHTML(editor) {
	var offset = editor.getCaretPos();
		
	var image = findImage(editor);
	if (image) {
		var re = /\bsrc=(["'])(.+?)\1/i, m, src;
		if (m = re.exec(image.tag))
			src = m[2];
		
		if (src) {
			var size = getImageSizeForSource(editor, src);
			if (size) {
				var new_tag = replaceOrAppend(image.tag, 'width', size.width);
				new_tag = replaceOrAppend(new_tag, 'height', size.height);
				
				return {
					'data': new_tag,
					'start': image.start,
					'end': image.end,
					'caret': offset
				};
			}
		}
	}
	
	return null;
}

/**
 * Search for insertion point for new CSS properties
 * @param {ParserUtils.token[]} tokens
 * @param {Number} start_ix Token index where to start searching
 */
function findCSSInsertionPoint(tokens, start_ix) {
	var ins_point, 
		ins_ix = -1, 
		need_col = false;
		
	for (var i = start_ix, il = tokens.length; i < il; i++) {
		var t = tokens[i];
		if (t.type == 'value') {
			ins_point = t;
			ins_ix = i;
			// look ahead fo rule termination
			if (tokens[i + 1] && tokens[i + 1].type == ';') {
				ins_point = tokens[i + 1];
				ins_ix += 1;
			} else {
				need_col = true;
			}
			break;
		}
	}
	
	return {
		token: ins_point,
		ix: ins_ix,
		need_col: need_col
	};
}

/**
 * Updates image size of CSS rule
 * @param {zen_editor} editor
 */
function updateImageSizeCSS(editor) {
	var caret_pos = editor.getCaretPos(),
		content = String(editor.getContent()),
		rule = ParserUtils.extractCSSRule(content, caret_pos, true);
		
	
	if (rule) {
		var css = ParserUtils.parseCSS(content.substring(rule[0], rule[1]), rule[0]),
			cur_token = findTokenFromPosition(css, caret_pos, 'identifier'),
			value = findValueToken(css, cur_token + 1),
			m;
			
		if (!value) return false;
		
		// find inserion point
		var ins_point = findCSSInsertionPoint(css, cur_token);
			
		if (m = /url\((["']?)(.+?)\1\)/i.exec(value.content)) {
			var size = getImageSizeForSource(editor, m[2]);
			if (size) {
				var wh = {width: null, height: null},
					updates = [],
					styler = learnCSSStyle(css, cur_token);
					
				for (var i = 0, il = css.length; i < il; i++) {
					if (css[i].type == 'identifier' && css[i].content in wh)
						wh[css[i].content] = i;
				}
				
				function update(name, val) {
					var v;
					if (wh[name] !== null && (v = findValueToken(css, wh[name] + 1))) {
						updates.push([v.start, v.end, val + 'px']);
					} else {
						updates.push([ins_point.token.end, ins_point.token.end, styler(name, val + 'px')]);
					}
				}
				
				update('width', size.width);
				update('height', size.height);
				
				if (updates.length) {
					updates.sort(function(a, b){return a[0] - b[0]});
					
					// some editors do not provide easy way to replace multiple code 
					// fragments so we have to squash all replace operations into one
					var data = content.substring(updates[0][0], updates[updates.length - 1][1]),
						offset = updates[0][0];
						
					for (var i = updates.length - 1; i >= 0; i--) {
						var u = updates[i];
						data = replaceSubstring(data, u[0] - offset, u[1] - offset, u[2]);
							
						// also calculate new caret position
						if (u[0] < caret_pos)
							caret_pos += u[2].length - u[1] + u[0];
					}
					
					if (ins_point.need_col)
						data = replaceSubstring(data, ins_point.token.end - offset, ins_point.token.end - offset, ';');
					
					return {
						'data': data,
						'start': offset,
						'end': updates[updates.length - 1][1],
						'caret': caret_pos
					};
					
				}
			}
		}
	}
		
	return false;
}

/**
 * Learns formatting style from parsed tokens
 * @param {ParserUtils.token[]} tokens List of tokens
 * @param {Number} pos Identifier token position, from which style should be learned
 * @returns {Function} Function with <code>(name, value)</code> arguments that will create
 * CSS rule based on learned formatting
 */
function learnCSSStyle(tokens, pos) {
	var prefix = '', glue = '', i, il;
	
	// use original tokens instead of optimized ones
	pos = tokens[pos].ref_start_ix;
	tokens = tokens.__original;
	
	// learn prefix
	for (i = pos - 1; i >= 0; i--) {
		if (tokens[i].type == 'white') {
			prefix = tokens[i].content + prefix;
		} else if (tokens[i].type == 'line') {
			prefix = tokens[i].content + prefix;
			break;
		} else {
			break;
		}
	}
	
	// learn glue
	for (i = pos + 1, il = tokens.length; i < il; i++) {
		if (tokens[i].type == 'white' || tokens[i].type == ':')
			glue += tokens[i].content;
		else break;
	}
	
	if (glue.indexOf(':') == -1)
		glue = ':';
	
	return function(name, value) {
		return prefix + name + glue + value + ';';
	};
}

/**
 * Returns image dimentions for source
 * @param {zen_editor} editor
 * @param {String} src Image source (path or data:url)
 */
function getImageSizeForSource(editor, src) {
	var f_content;
	if (src) {
		// check if it is data:url
		if (startsWith('data:', src)) {
			f_content = base64.decode( src.replace(/^data\:.+?;.+?,/, '') );
		} else {
			var abs_path = zen_file.locateFile(editor.getFilePath(), src);
			if (abs_path === null) {
				throw "Can't find " + src + ' file';
			}
			
			f_content = String(zen_file.read(abs_path));
		}
		
		return zen_coding.getImageSize(f_content);
	}
}

/**
 * Find image tag under caret
 * @param {zen_editor} editor
 * @return Image tag and its indexes inside editor source
 */
function findImage(editor) {
	var caret_pos = editor.getCaretPos(),
		content = String(editor.getContent()),
		content_len = content.length,
		start_ix = -1,
		end_ix = -1;
	
	// find the beginning of the tag
	do {
		if (caret_pos < 0)
			break;
		if (content.charAt(caret_pos) == '<') {
			if (content.substring(caret_pos, caret_pos + 4).toLowerCase() == '<img') {
				// found the beginning of the image tag
				start_ix = caret_pos;
				break;
			} else {
				// found some other tag
				return null;
			}
		}
	} while(caret_pos--);
	
	// find the end of the tag 
	caret_pos = editor.getCaretPos();
	do {
		if (caret_pos >= content_len)
			break;
			
		if (content.charAt(caret_pos) == '>') {
			end_ix = caret_pos + 1;
			break;
		}
	} while(caret_pos++);
	
	if (start_ix != -1 && end_ix != -1)
		
		return {
			start: start_ix,
			end: end_ix,
			tag: content.substring(start_ix, end_ix)
		};
	
	return null;
}

/**
 * Replaces or adds attribute to the tag
 * @param {String} img_tag
 * @param {String} attr_name
 * @param {String} attr_value
 */
function replaceOrAppend(img_tag, attr_name, attr_value) {
	if (img_tag.toLowerCase().indexOf(attr_name) != -1) {
		// attribute exists
		var re = new RegExp(attr_name + '=([\'"])(.*?)([\'"])', 'i');
		return img_tag.replace(re, function(str, p1, p2){
			return attr_name + '=' + p1 + attr_value + p1;
		});
	} else {
		return img_tag.replace(/\s*(\/?>)$/, ' ' + attr_name + '="' + attr_value + '" $1');
	}
}

function doCSSReflection(editor) {
	var content = String(editor.getContent()),
		caret_pos = editor.getCaretPos(),
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
				value = value_token.content,
				rv;
				
			for (var i = values.length - 1; i >= 0; i--) {
				v = values[i].value;
				rv = getReflectedValue(cur_prop, value, values[i].name.content, v.content);
				data = replaceSubstring(data, v.start - offset, v.end - offset, rv);
					
				// also calculate new caret position
				if (v.start < caret_pos) {
					caret_pos += rv.length - v.content.length;
				}
			}
			
			return {
				'data': data,
				'start': offset,
				'end': values[values.length - 1].value.end,
				'caret': caret_pos
			};
		}
	}
}

zen_coding.actions.doCSSReflection = doCSSReflection;

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
zen_coding.registerAction('update_image_size', updateImageSize);