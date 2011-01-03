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
 */var CSSUtils = (function() {
	
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
	
	function cssToken(type, value, pos, ix) {
		value = value || '';
		return {
			type: type || '',
			value: value,
			charstart: pos,
			charend: pos + value.length,
			/** Reference token index that starts current token */
			ref_start_ix: ix,
			/** Reference token index that ends current token */
			ref_end_ix: ix
		}
	}
	
	
	return {
		/**
		 * Parses CSS and optimizes parsed chunks
		 * @see CSSUtils#optimize
		 * @param {String} source CSS source code fragment
		 * @param {Number} offset Offset of CSS fragment inside whole document
		 * @return {Array}
		 */
		parse: function(source, offset) {
			return this.optimize(CSSEX.lex(source), offset || 0, source);
		},
		
		/**
		 * Optimizes parsed CSS tokens: combines selector chunks, complex values
		 * into a single chunk
		 * @param {Array} tokens Tokens produced by <code>CSSEX.lex()</code>
		 * @param {Number} offset CSS rule offset in source code (character index)
		 * @param {String} Original CSS source code
		 * @return {Array} Optimized tokens  
		 */
		optimize: function(tokens, offset, content) {
			offset = offset || 0;
			var result = [], token, i, il, _o = 0,
				in_rules = false,
				in_value = false,
				acc_type,
				acc_tokens = {
					/** @type {cssToken} */
					selector: null,
					/** @type {cssToken} */
					value: null
				};
				
			function addToken(token, type) {
				if (type && type in acc_tokens) {
					if (!acc_tokens[type]) {
						acc_tokens[type] = cssToken(type, token.value, offset + token.charstart, i);
						result.push(acc_tokens[type]);
					} else {
						acc_tokens[type].value += token.value;
						acc_tokens[type].charend += token.value.length;
						acc_tokens[type].ref_end_ix = i;
					}
				} else {
					result.push(cssToken(token.type, token.value, offset + token.charstart, i));
				}
			}
				
			for (i = 0, il = tokens.length; i < il; i++) {
				token = tokens[i];
				acc_type = null;
				
				if (token.type == 'line') {
					offset += _o;
					offset += content ? calculateNlLength(content, offset) : 1;
					_o = 0;
					continue;
				}
				
				_o = token.charend;
				
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
						} else if ((token.type == 'identifier' && in_value) || acc_tokens.value) {
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
			
			return result;
		},
		
		extractRule: function(content, pos) {
			
		}
	};
})();