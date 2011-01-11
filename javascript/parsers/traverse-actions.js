/**
 * Actions that use stream parsers and tokenizers for traversing:
 * -- Search for next/previuos items in HTML
 * -- Search for next/previuos items in CSS
 * 
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * 
 * @include "../zen_editor.js"
 * @include "utils.js"
 * @include "stringstream.js"
 * @include "parsexml.js"
 * @include "tokenize.js"
 * @include "sex.js"
 * @include "parserutils.js"
 */
(function(){
	var start_tag = /^<([\w\:\-]+)((?:\s+[\w\-:]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/,
		known_xml_types = {
			'xml-tagname': 1,
			'xml-attname': 1,
			'xml-attribute': 1
		},
		known_css_types = {
			'selector': 1,
			'identifier': 1,
			'value': 1
		};
	
	/**
	 * Find next HTML item
	 * @param {zen_editor} editor
	 */
	function findNextHTMLItem(editor) {
		var is_first = true;
		return findItem(editor, false, function(content, search_pos){
			if (is_first) {
				is_first = false;
				return findOpeningTagFromPosition(content, search_pos);
			} else {
				return getOpeningTagFromPosition(content, search_pos);
			}
		}, getRangeForNextItemInHTML);
	}
	
	/**
	 * Find previous HTML item
	 * @param {zen_editor} editor
	 */
	function findPrevHTMLItem(editor) {
		return findItem(editor, true, getOpeningTagFromPosition, getRangeForPrevItemInHTML);
	}
	
	/**
	 * Returns range for item to be selected in tag after current caret position
	 * @param {String} tag Tag declaration
	 * @param {Number} offset Tag's position index inside content
	 * @param {Number} sel_start Start index of user selection
	 * @param {Number} sel_end End index of user selection
	 * @return {Array} Returns array with two indexes if next item was found, 
	 * <code>null</code> otherwise
	 */
	function getRangeForNextItemInHTML(tag, offset, sel_start, sel_end) {
		var tokens = ParserUtils.parseHTML(tag, offset),
			next = [];
				
		// search for token that is right to selection
		for (var i = 0, il = tokens.length; i < il; i++) {
			/** @type {ParserUtils.token} */
			var token = tokens[i], pos_test;
			if (token.type in known_xml_types) {
				// check token position
				pos_test = token.start >= sel_start;
				if (token.type == 'xml-attribute' && isQuote(token.content.charAt(0)))
					pos_test = token.start + 1 >= sel_start && token.end -1 != sel_end;
				
				if (!pos_test && !(sel_start == sel_end && token.end > sel_start)) continue;
				
				// found token that should be selected
				if (token.type == 'xml-attname') {
					next = handleFullAttributeHTML(tokens, i, sel_end <= token.end ? token.start : -1);
					if (next) return next;
				} else if (token.end > sel_end) {
					next = [token.start, token.end];
					
					if (token.type == 'xml-attribute')
						next = handleQuotesHTML(token.content, next);
						
					if (sel_start == next[0] && sel_end == next[1])
						// in case of empty attribute
						continue;
					
					return next;
				}
			}
		}
		
		return null;
	}
	
	/**
	 * Returns range for item to be selected in tag before current caret position
	 * @param {String} tag Tag declaration
	 * @param {Number} offset Tag's position index inside content
	 * @param {Number} sel_start Start index of user selection
	 * @param {Number} sel_end End index of user selection
	 * @return {Array} Returns array with two indexes if next item was found, 
	 * <code>null</code> otherwise
	 */
	function getRangeForPrevItemInHTML(tag, offset, sel_start, sel_end) {
		var tokens = ParserUtils.parseHTML(tag, offset),
			next;
				
		// search for token that is left to the selection
		for (var i = tokens.length - 1, il = tokens.length; i >= 0; i--) {
			/** @type {ParserUtils.token} */
			var token = tokens[i], pos_test;
			if (token.type in known_xml_types) {
				// check token position
				pos_test = token.start < sel_start;
				if (token.type == 'xml-attribute' && isQuote(token.content.charAt(0))) {
					pos_test = token.start + 1 < sel_start;
				}
				
				if (!pos_test) continue;
				
				// found token that should be selected
				if (token.type == 'xml-attname') {
					next = handleFullAttributeHTML(tokens, i, token.start);
					if (next) return next;
				} else {
					next = [token.start, token.end];
					
					if (token.type == 'xml-attribute')
						next = handleQuotesHTML(token.content, next);
					
					return next;
				}
			}
		}
		
		return null;
	}
	
	/**
	 * Search for opening tag in content, starting at specified position
	 * @param {String} html Where to search tag
	 * @param {Number} pos Character index where to start searching
	 * @return {Array} Returns array with tag indexes if valid opening tag was found,
	 * <code>null</code> otherwise
	 */
	function findOpeningTagFromPosition(html, pos) {
		var tag;
		while (pos >= 0) {
			if (tag = getOpeningTagFromPosition(html, pos))
				return tag;
			pos--;
		}
		
		return null;
	}
	
	/**
	 * @param {String} html Where to search tag
	 * @param {Number} pos Character index where to start searching
	 * @return {Array} Returns array with tag indexes if valid opening tag was found,
	 * <code>null</code> otherwise
	 */
	function getOpeningTagFromPosition(html, pos) {
		var m;
		if (html.charAt(pos) == '<' && (m = html.substring(pos, html.length).match(start_tag)))
			return [pos, pos + m[0].length];
	}
	
	function isQuote(ch) {
		return ch == '"' || ch == "'";
	}
	
	/**
	 * Find item
	 * @param {zen_editor} editor
	 * @param {String} is_backward Search backward (search forward otherwise)
	 * @param {Function} extract_fn Function that extracts item content
	 * @param {Function} range_rn Function that search for next token range
	 */
	function findItem(editor, is_backward, extract_fn, range_fn) {
		var content = String(editor.getContent()),
			c_len = content.length,
			item,
			item_def,
			rng,
			loop = 100000, // endless loop protection
			prev_range = [-1, -1],
			sel = editor.getSelectionRange(),
			sel_start = Math.min(sel.start, sel.end),
			sel_end = Math.max(sel.start, sel.end);
			
		var search_pos = sel_start;
		while (search_pos >= 0 && search_pos < c_len && loop > 0) {
			loop--;
			if ( (item = extract_fn(content, search_pos, is_backward)) ) {
				if (prev_range[0] == item[0] && prev_range[1] == item[1]) {
					break;
				}
				
				prev_range[0] = item[0];
				prev_range[1] = item[1];
				item_def = content.substring(item[0], item[1]);
				rng = range_fn(item_def, item[0], sel_start, sel_end);
					
				if (rng) {
					editor.createSelection(rng[0], rng[1]);
					return true;
				} else {
					search_pos = item[is_backward ? 0 : 1];
				}
			}
			
			search_pos += is_backward ? -1 : 1;
		}
		
		return false;
	}
	
	function findNextCSSItem(editor) {
		return findItem(editor, false, ParserUtils.extractCSSRule, getRangeForNextItemInCSS);
	}
	
	function findPrevCSSItem(editor) {
		return findItem(editor, true, ParserUtils.extractCSSRule, getRangeForPrevItemInCSS);
	}
	
	/**
	 * Returns range for item to be selected in tag after current caret position
	 * @param {String} rule CSS rule declaration
	 * @param {Number} offset Rule's position index inside content
	 * @param {Number} sel_start Start index of user selection
	 * @param {Number} sel_end End index of user selection
	 * @return {Array} Returns array with two indexes if next item was found, 
	 * <code>null</code> otherwise
	 */
	function getRangeForNextItemInCSS(rule, offset, sel_start, sel_end) {
		var tokens = ParserUtils.parseCSS(rule, offset), pos_test,
			next = [];
			
		/**
		 * Same range is used inside complex value processor
		 * @return {Boolean}
		 */
		function checkSameRange(r) {
			return r[0] == sel_start && r[1] == sel_end;
		}
				
		// search for token that is right to selection
		for (var i = 0, il = tokens.length; i < il; i++) {
			/** @type {ParserUtils.token} */
			var token = tokens[i], pos_test;
			if (token.type in known_css_types) {
				// check token position
				if (sel_start == sel_end)
					pos_test = token.end > sel_start;
				else {
					pos_test = token.start >= sel_start;
					if (token.type == 'value') // respect complex values
						pos_test = pos_test || sel_start >= token.start && token.end >= sel_end;
				}
				
				if (!pos_test) continue;
				
				// found token that should be selected
				if (token.type == 'identifier') {
					var rule_sel = handleFullRuleCSS(tokens, i, sel_end <= token.end ? token.start : -1);
					if (rule_sel) return rule_sel;
					
				} else if (token.type == 'value' && sel_end > token.start && token.children) {
					// looks like a complex value
					var children = token.children;
					for (var j = 0, jl = children.length; j < jl; j++) {
						if (children[j][0] >= sel_start || (sel_start == sel_end && children[j][1] > sel_start)) {
							next = [children[j][0], children[j][1]];
							if (checkSameRange(next)) {
								var rule_sel = handleCSSSpecialCase(rule, next[0], next[1], offset);
								if (!checkSameRange(rule_sel))
									return rule_sel;
								else
									continue;
							}
							
							return next;
						}
					}
				} else if (token.end > sel_end) {
					return [token.start, token.end];
				}
			}
		}
		
		return null;
	}
	
	/**
	 * Returns range for item to be selected in CSS rule before current caret position
	 * @param {String} rule CSS rule declaration
	 * @param {Number} offset Rule's position index inside content
	 * @param {Number} sel_start Start index of user selection
	 * @param {Number} sel_end End index of user selection
	 * @return {Array} Returns array with two indexes if next item was found, 
	 * <code>null</code> otherwise
	 */
	function getRangeForPrevItemInCSS(rule, offset, sel_start, sel_end) {
		var tokens = ParserUtils.parseCSS(rule, offset),
			next = [];
				
		/**
		 * Same range is used inside complex value processor
		 * @return {Boolean}
		 */
		function checkSameRange(r) {
			return r[0] == sel_start && r[1] == sel_end;
		}
			
		// search for token that is left to the selection
		for (var i = tokens.length - 1, il = tokens.length; i >= 0; i--) {
			/** @type {ParserUtils.token} */
			var token = tokens[i], pos_test;
			if (token.type in known_css_types) {
				// check token position
				pos_test = token.start < sel_start;
				if (token.type == 'value' && token.ref_start_ix != token.ref_end_ix) // respect complex values
					pos_test = token.start <= sel_start;
				
				if (!pos_test) continue;
				
				// found token that should be selected
				if (token.type == 'identifier') {
					var rule_sel = handleFullRuleCSS(tokens, i, token.start);
					if (rule_sel) return rule_sel;
				} else if (token.type == 'value' && token.ref_start_ix != token.ref_end_ix) {
					// looks like a complex value
					var children = token.children;
					for (var j = children.length - 1; j >= 0; j--) {
						if (children[j][0] < sel_start) {
							// create array copy
							next = [children[j][0], children[j][1]]; 
							
							var rule_sel = handleCSSSpecialCase(rule, next[0], next[1], offset);
							return !checkSameRange(rule_sel) ? rule_sel : next;
						}
					}
					
					// if we are here than we already traversed trough all
					// child tokens, select full value
					next = [token.start, token.end];
					if (!checkSameRange(next)) 
						return next;
				} else {
					return [token.start, token.end];
				}
			}
		}
		
		return null;
	}
	
	function handleFullRuleCSS(tokens, i, start) {
		for (var j = i + 1, il = tokens.length; j < il; j++) {
			/** @type {ParserUtils.token} */
			var _t = tokens[j];
			if ((_t.type == 'value' && start == -1) || _t.type == 'identifier') {
				return [_t.start, _t.end];
			} else if (_t.type == ';') {
				return [start == -1 ? _t.start : start, _t.end];
			} else if (_t.type == '}') {
				return [start == -1 ? _t.start : start, _t.start - 1];
			}
		}
		
		return null;
	}
	
	function handleFullAttributeHTML(tokens, i, start) {
		for (var j = i + 1, il = tokens.length; j < il; j++) {
			/** @type {ParserUtils.token} */
			var _t = tokens[j];
			if (_t.type == 'xml-attribute') {
				if (start == -1)
					return handleQuotesHTML(_t.content, [_t.start, _t.end]);
				else
					return [start, _t.end];
			} else if (_t.type == 'xml-attname') {
				// moved to next attribute, adjust selection
				return [_t.start, tokens[i].end];
			}
		}
			
		return null;
	}
	
	function handleQuotesHTML(attr, r) {
		if (isQuote(attr.charAt(0)))
			r[0]++;
		if (isQuote(attr.charAt(attr.length - 1)))
			r[1]--;
			
		return r;
	}
	
	function handleCSSSpecialCase(text, start, end, offset) {
		text = text.substring(start - offset, end - offset);
		var m;
		if (m = text.match(/^url\(['"]?/)) {
			start += m[0].length;
			if (m = text.match(/['"]?\)$/))
				end -= m[0].length;
		}
		
		return [start, end];
	}
	
	// XXX register actions 
	zen_coding.registerAction('select_next_item', function(/* zen_editor */ editor){
		if (editor.getSyntax() == 'css')
			return findNextCSSItem(editor);
		else
			return findNextHTMLItem(editor);
	});
	
	zen_coding.registerAction('select_previous_item', function(/* zen_editor */ editor){
		if (editor.getSyntax() == 'css')
			return findPrevCSSItem(editor);
		else
			return findPrevHTMLItem(editor);
	});
})();