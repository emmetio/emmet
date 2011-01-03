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
	
	function cssToken(type, value, start, end) {
		return {
			type: type || '',
			value: value || '',
			/** Reference token index that starts current token */
			ref_start_ix: typeof start == 'undefined' ? -1 : start,
			/** Reference token index that ends current token */
			ref_end_ix: typeof end == 'undefined' ? -1 : end
		}
	}
	
	
	return {
		/**
		 * Parses CSS and optimizes parsed chunks
		 * @see CSSUtils#optimize 
		 */
		parse: function(source) {
			return this.optimize(CSSEX.lex(source));
		},
		
		/**
		 * Optimizes parsed CSS tokens: combines selector chunks, complex values
		 * into a single chunk
		 * @param {Array} tokens Tokens produced by <code>CSSEX.lex()</code>
		 * @return {Array} Optimized tokens  
		 */
		optimize: function(tokens) {
			var result = [], token, next_token,
				in_selector = false,
				in_rules = false,
				in_value = false,
				/** @type {cssToken} */
				selector_token,
				/** @type {cssToken} */
				value_token,
				stop_chars = '{};';
				
			for (var i = 0, il = tokens.length; i < il; i++) {
				token = tokens[i];
				if (token.type == 'line') continue;
				
				if (token.type != 'white') {
					if (token.type == '{') {
						in_selector = false;
						in_rules = true;
						result.push(cssToken(token.type, token.value, i, i));
					} else if (in_rules) {
						if (token.type == 'identifier') {
							if (!in_value) {
								result.push(cssToken('property', token.value, i, i));
							} else {
								if (!value_token) {
									value_token = cssToken('value', '', i, i);
									result.push(value_token);
								}
								value_token.value += token.value;
								value_token.ref_end_ix = i;
							}
						} else if (token.type == ':') {
							in_value = true;
							result.push(cssToken(token.type, token.value, i, i));
						} else if (token.type == ';') {
							in_value = false;
							value_token = null;
							result.push(cssToken(token.type, token.value, i, i));
						}  else if (token.type == '}') {
							in_value = in_rules = false;
							value_token = null;
							result.push(cssToken(token.type, token.value, i, i));
						} else if (value_token) {
							value_token.value += token.value;
							value_token.ref_end_ix = i;
						}
					} else if (in_selector) {
						selector_token.value += token.value;
						selector_token.ref_end_ix += i;
					}
					
					if (!in_selector && !in_rules && !isStopChar(token)) {
						// start selector token
						in_selector = true;
						selector_token = cssToken('selector', token.value, i, i);
						result.push(selector_token);
					}
				} else {
					// whitespace token, decide where it should be
					next_token = tokens[i + 1];
					if (next_token && isStopChar(next_token)) {
						continue;
					}
					
					if (in_selector) {
						selector_token.value += token.value;
						selector_token.ref_end_ix = i;
					} else if (value_token) {
						value_token.value += token.value;
						value_token.ref_end_ix = i;
					}
				}
			}
			
			return result;
		},
		
		extractRule: function(content, pos) {
			
		}
	}
})();