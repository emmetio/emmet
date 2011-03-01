/**
 * Some utility functions for CSS parser:
 * -- optimizes CSS lexer token, produced by Stoyan Stefanov's CSSEX parser,
 *    for Zen Coding needs
 * -- extracts full CSS rule (selector + style rules) from content
 *  
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * 
 * @include "sex.js"
 */var ParserUtils = (function() {
	var css_stop_chars = '{}/\\<>';
	
	function isStopChar(token) {
		var stop_chars = '{};:';
		return stop_chars.indexOf(token.type) != -1;
	}
	
	/**
	 * Calculates newline width at specified position in content
	 * @param {String} content
	 * @param {Number} pos
	 * @return {Number}
	 */
	function calculateNlLength(content, pos) {
		return content.charAt(pos) == '\r' && content.charAt(pos + 1) == '\n' ? 2 : 1;
	}
	
	/**
	 * Post-process optmized tokens: collapse tokens for complex values
	 * @param {Array} optimized Optimized tokens
	 * @param {Array} original Original preprocessed tokens 
	 */
	function postProcessOptimized(optimized, original) {
		var token, child;
		for (var i = 0, il = optimized.length; i < il; i++) {
			token = optimized[i];
			if (token.type == 'value') {
				token.children = [];
				child = null;
				
				var subtoken_start = token.ref_start_ix;
					
				while (subtoken_start <= token.ref_end_ix) {
					var subtoken = original[subtoken_start];
					if (subtoken.type != 'white') {
						if (!child)
							child = [subtoken.start, subtoken.end];
						else
							child[1] = subtoken.end;
					} else if (child) {
						token.children.push(child);
						child = null;
					}
					
					subtoken_start++;	
				}
				
				if (child) // push last token
					token.children.push(child);
			}
		}
		
		return optimized;
	}
	
	function makeToken(type, value, pos, ix) {
		value = value || '';
		return {
			type: type || '',
			content: value,
			start: pos,
			end: pos + value.length,
			/** Reference token index that starts current token */
			ref_start_ix: ix,
			/** Reference token index that ends current token */
			ref_end_ix: ix
		}
	}
	
	return {
		/**
		 * Parses CSS and optimizes parsed chunks
		 * @see ParserUtils#optimizeCSS
		 * @param {String} source CSS source code fragment
		 * @param {Number} offset Offset of CSS fragment inside whole document
		 * @return {Array}
		 */
		parseCSS: function(source, offset) {
			return this.optimizeCSS(CSSEX.lex(source), offset || 0, source);
		},
		
		/**
		 * Parses HTML and optimizes parsed chunks
		 * @param {String} source HTML source code fragment
		 * @param {Number} offset Offset of HTML fragment inside whole document
		 * @return {Array}
		 */
		parseHTML: function(tag, offset) {
			var tokens = XMLParser.make(tag),
				result = [],
				t, i = 0;
				
			try {
				while (t = tokens.next()) {
//					result.push(tagDef(offset + i, t));
					result.push(makeToken(t.style, t.content, offset + i, 0));
					i += t.value.length;
				}
			} catch (e) {
				if (e != 'StopIteration') throw e;
			}
			
			return result;
		},
		
		/**
		 * Optimizes parsed CSS tokens: combines selector chunks, complex values
		 * into a single chunk
		 * @param {Array} tokens Tokens produced by <code>CSSEX.lex()</code>
		 * @param {Number} offset CSS rule offset in source code (character index)
		 * @param {String} content Original CSS source code
		 * @return {Array} Optimized tokens  
		 */
		optimizeCSS: function(tokens, offset, content) {
			offset = offset || 0;
			var result = [], token, i, il, _o = 0,
				in_rules = false,
				in_value = false,
				acc_type,
				acc_tokens = {
					/** @type {makeToken} */
					selector: null,
					/** @type {makeToken} */
					value: null
				},
				nl_size,
				orig_tokens = [];
				
			function addToken(token, type) {
				if (type && type in acc_tokens) {
					if (!acc_tokens[type]) {
						acc_tokens[type] = makeToken(type, token.value, offset + token.charstart, i);
						result.push(acc_tokens[type]);
					} else {
						acc_tokens[type].content += token.value;
						acc_tokens[type].end += token.value.length;
						acc_tokens[type].ref_end_ix = i;
					}
				} else {
					result.push(makeToken(token.type, token.value, offset + token.charstart, i));
				}
			}
				
			for (i = 0, il = tokens.length; i < il; i++) {
				token = tokens[i];
				acc_type = null;
				
				if (token.type == 'line') {
					nl_size = content ? calculateNlLength(content, offset) : 1;
					var tok_value = nl_size == 1 ? '\n' : '\r\n';
					offset += _o;
					
					orig_tokens.push(makeToken(token.type, tok_value, offset));
					
					result.push(makeToken(token.type, tok_value, offset, i));
					offset += nl_size;
					_o = 0;
					
					continue;
				}
				
				orig_tokens.push(makeToken(token.type, token.value, offset + token.charstart));
				
//				_o = token.charend;
				// use charstart and length because of incorrect charend 
				// computation for whitespace
				_o = token.charstart + token.value.length;
				
				if (token.type != 'white') {
					if (token.type == '{') {
						in_rules = true;
						acc_tokens.selector = null;
					} else if (in_rules) {
						if (token.type == ':') {
							in_value = true;
						} else if (token.type == ';') {
							in_value = false;
							acc_tokens.value = null;
						}  else if (token.type == '}') {
							in_value = in_rules = false;
							acc_tokens.value = null;
						} else if (in_value || acc_tokens.value) {
							acc_type = 'value';
						}
					} else if (acc_tokens.selector || (!in_rules && !isStopChar(token))) {
						// start selector token
						acc_type = 'selector';
					}
					
					addToken(token, acc_type);
				} else {
					// whitespace token, decide where it should be
					if (i < il - 1 && isStopChar(tokens[i + 1])) continue;
					
					if (acc_tokens.selector || acc_tokens.value)
						addToken(token, acc_tokens.selector ? 'selector' : 'value');
				}
			}
			
			result.__original = orig_tokens;
			return postProcessOptimized(result, orig_tokens);
		},
		
		/**
		 * Extracts single CSS selector definition from source code
		 * @param {String} content CSS source code
		 * @param {Number} pos Character position where to start source code extraction
		 */
		extractCSSRule: function(content, pos, is_backward) {
			var result = '', 
				c_len = content.length,
				offset = pos, 
				brace_pos = -1, ch;
			
			// search left until we find rule edge
			while (offset >= 0) {
				ch = content.charAt(offset);
				if (ch == '{') {
					brace_pos = offset;
					break;
				}
				else if (ch == '}' && !is_backward) {
					offset++;
					break;
				}
				
				offset--;
			}
			
			// search right for full rule set
			while (offset < c_len) {
				ch = content.charAt(offset);
				if (ch == '{')
					brace_pos = offset;
				else if (ch == '}') {
					if (brace_pos != -1)
						result = content.substring(brace_pos, offset + 1);
					break;
				}
				
				offset++;
			}
			
			if (result) {
				// find CSS selector
				offset = brace_pos - 1;
				var selector = '';
				while (offset >= 0) {
					ch = content.charAt(offset);
					if (css_stop_chars.indexOf(ch) != -1) break;
					offset--;
				}
				
				// also trim whitespace
				selector = content.substring(offset + 1, brace_pos).replace(/^[\s\n\r]+/m, '');
				return [brace_pos - selector.length, brace_pos + result.length];
			}
			
			return null;
		},
		
		token: makeToken
	};
})();
