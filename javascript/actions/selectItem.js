/**
 * Actions that use stream parsers and tokenizers for traversing:
 * -- Search for next/previous items in HTML
 * -- Search for next/previous items in CSS
 * @constructor
 * @memberOf __zenSelectItemAction
 */
(function(){
	var startTag = /^<([\w\:\-]+)((?:\s+[\w\-:]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/;
	var knownXMLTypes = {
		'xml-tagname': 1,
		'xml-attname': 1,
		'xml-attribute': 1
	};
	var knownCSSTypes = {
		'selector': 1,
		'identifier': 1,
		'value': 1
	};
	
	/**
	 * Find next HTML item
	 * @param {zen_editor} editor
	 */
	function findNextHTMLItem(editor) {
		var isFirst = true;
		return findItem(editor, false, function(content, search_pos){
			if (isFirst) {
				isFirst = false;
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
		var parserUtils = zen_coding.require('parserUtils');
		var tokens = parserUtils.parseHTML(tag, offset);
		var next = [];
				
		// search for token that is right to selection
		for (var i = 0, il = tokens.length; i < il; i++) {
			/** @type {syntaxToken} */
			var token = tokens[i], pos_test;
			if (token.type in knownXMLTypes) {
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
		var parserUtils = zen_coding.require('parserUtils');
		var tokens = parserUtils.parseHTML(tag, offset);
		var next;
				
		// search for token that is left to the selection
		for (var i = tokens.length - 1, il = tokens.length; i >= 0; i--) {
			/** @type {syntaxToken} */
			var token = tokens[i], pos_test;
			if (token.type in knownXMLTypes) {
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
		if (html.charAt(pos) == '<' && (m = html.substring(pos, html.length).match(startTag))) {
			return [pos, pos + m[0].length];
		}
	}
	
	function isQuote(ch) {
		return ch == '"' || ch == "'";
	}
	
	/**
	 * Find item
	 * @param {IZenEditor} editor
	 * @param {Boolean} isBackward Search backward (search forward otherwise)
	 * @param {Function} extractFn Function that extracts item content
	 * @param {Function} rangeFn Function that search for next token range
	 */
	function findItem(editor, isBackward, extractFn, rangeFn) {
		var content = String(editor.getContent());
		var contentLength = content.length;
		var item, itemDef, rng;
		var prevRange = [-1, -1];
		var sel = editor.getSelectionRange();
		var selStart = Math.min(sel.start, sel.end);
		var selEnd = Math.max(sel.start, sel.end);
			
		var searchPos = selStart, loop = 100000; // endless loop protection
		while (searchPos >= 0 && searchPos < contentLength && loop > 0) {
			loop--;
			if ( (item = extractFn(content, searchPos, isBackward)) ) {
				if (prevRange[0] == item[0] && prevRange[1] == item[1]) {
					break;
				}
				
				prevRange[0] = item[0];
				prevRange[1] = item[1];
				itemDef = content.substring(item[0], item[1]);
				rng = rangeFn(itemDef, item[0], selStart, selEnd);
					
				if (rng) {
					editor.createSelection(rng[0], rng[1]);
					return true;
				} else {
					searchPos = isBackward ? item[0] : item[1] - 1;
				}
			}
			
			searchPos += isBackward ? -1 : 1;
		}
		
		return false;
	}
	
	function findNextCSSItem(editor) {
		return findItem(editor, false, zen_coding.require('cssEditTree').extractRule, getRangeForNextItemInCSS);
	}
	
	function findPrevCSSItem(editor) {
		return findItem(editor, true, zen_coding.require('cssEditTree').extractRule, getRangeForPrevItemInCSS);
	}
	
	/**
	 * Returns range for item to be selected in tag after current caret position
	 * @param {String} rule CSS rule declaration
	 * @param {Number} offset Rule's position index inside content
	 * @param {Number} selStart Start index of user selection
	 * @param {Number} selEnd End index of user selection
	 * @return {Array} Returns array with two indexes if next item was found, 
	 * <code>null</code> otherwise
	 */
	function getRangeForNextItemInCSS_old(rule, offset, selStart, selEnd) {
		var tokens = zen_coding.require('parserUtils').parseCSS(rule, offset); 
		var next = [];
			
		/**
		 * Same range is used inside complex value processor
		 * @return {Boolean}
		 */
		function checkSameRange(r) {
			return r[0] == selStart && r[1] == selEnd;
		}
				
		// search for token that is right to selection
		for (var i = 0, il = tokens.length; i < il; i++) {
			/** @type {syntaxToken} */
			var token = tokens[i], posTest;
			if (token.type in knownCSSTypes) {
				// check token position
				if (selStart == selEnd)
					posTest = token.end > selStart;
				else {
					posTest = token.start >= selStart;
					if (token.type == 'value') // respect complex values
						posTest = posTest || selStart >= token.start && token.end >= selEnd;
				}
				
				if (!posTest) continue;
				
				// found token that should be selected
				if (token.type == 'identifier') {
					var rule_sel = handleFullRuleCSS(tokens, i, selEnd <= token.end ? token.start : -1);
					if (rule_sel) return rule_sel;
					
				} else if (token.type == 'value' && selEnd > token.start && token.children) {
					// looks like a complex value
					var children = token.children;
					for (var j = 0, jl = children.length; j < jl; j++) {
						if (children[j][0] >= selStart || (selStart == selEnd && children[j][1] > selStart)) {
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
				} else if (token.end > selEnd) {
					return [token.start, token.end];
				}
			}
		}
		
		return null;
	}
	
	/**
	 * Makes all possible selection ranges for specified CSS property
	 * @param {CSSProperty} property
	 * @returns {Array}
	 */
	function makePossibleRangesCSS(property) {
		// find all possible ranges, sorted by position and size
		var result = [property.range(true), property.valueRange(true)];
		
		// locate parts of complex values.
		// some examples:
		// – 1px solid red: 3 parts
		// – arial, sans-serif: enumeration, 2 parts
		// – url(image.png): function value part
		
		return result;
	}
	
	/**
	 * Split complex CSS value into parts
	 * @param {String} value
	 * @returns {Array}
	 */
	function splitCSSValue(value) {
		// some examples:
		// – 1px solid red: 3 parts
		// – arial, sans-serif: enumeration, 2 parts
		
		var strings = [], funcs = [];
		
		// using naive approach: replace string and functions with placeholders
		
		
	}
	
	/**
	 * Returns range for item to be selected in tag after current caret position
	 * @param {String} rule CSS rule declaration
	 * @param {Number} offset Rule's position index inside content
	 * @param {Number} selStart Start index of user selection
	 * @param {Number} selEnd End index of user selection
	 * @return {Array} Returns array with two indexes if next item was found, 
	 * <code>null</code> otherwise
	 */
	function getRangeForNextItemInCSS(rule, offset, selStart, selEnd) {
		/** @type CSSRule */
		var tree = zen_coding.require('cssEditTree').parse(rule, {
			offset: offset
		});
		
		// check if selector is matched
		var range = tree.selectorRange(true);
		if (selEnd < range.end) {
			return range.toArray();
		}
		
		// find matched CSS property
		/** @type CSSProperty */
		var property = _.find(tree.list(), function(p) {
			return p.range(true).end > selEnd;
		});
		
		
		
		
		var tokens = zen_coding.require('parserUtils').parseCSS(rule, offset); 
		var next = [];
		
		/**
		 * Same range is used inside complex value processor
		 * @return {Boolean}
		 */
		function checkSameRange(r) {
			return r[0] == selStart && r[1] == selEnd;
		}
		
		// search for token that is right to selection
		for (var i = 0, il = tokens.length; i < il; i++) {
			/** @type {syntaxToken} */
			var token = tokens[i], posTest;
			if (token.type in knownCSSTypes) {
				// check token position
				if (selStart == selEnd)
					posTest = token.end > selStart;
					else {
						posTest = token.start >= selStart;
						if (token.type == 'value') // respect complex values
							posTest = posTest || selStart >= token.start && token.end >= selEnd;
					}
				
				if (!posTest) continue;
				
				// found token that should be selected
				if (token.type == 'identifier') {
					var rule_sel = handleFullRuleCSS(tokens, i, selEnd <= token.end ? token.start : -1);
					if (rule_sel) return rule_sel;
					
				} else if (token.type == 'value' && selEnd > token.start && token.children) {
					// looks like a complex value
					var children = token.children;
					for (var j = 0, jl = children.length; j < jl; j++) {
						if (children[j][0] >= selStart || (selStart == selEnd && children[j][1] > selStart)) {
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
				} else if (token.end > selEnd) {
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
	 * @param {Number} selStart Start index of user selection
	 * @param {Number} selEnd End index of user selection
	 * @return {Array} Returns array with two indexes if next item was found, 
	 * <code>null</code> otherwise
	 */
	function getRangeForPrevItemInCSS(rule, offset, selStart, selEnd) {
		var tokens = zen_coding.require('parserUtils').parseCSS(rule, offset);
		var next = [];
				
		/**
		 * Same range is used inside complex value processor
		 * @return {Boolean}
		 */
		function checkSameRange(r) {
			return r[0] == selStart && r[1] == selEnd;
		}
			
		// search for token that is left to the selection
		for (var i = tokens.length - 1, il = tokens.length; i >= 0; i--) {
			/** @type {syntaxToken} */
			var token = tokens[i], pos_test;
			if (token.type in knownCSSTypes) {
				// check token position
				pos_test = token.start < selStart;
				if (token.type == 'value' && token.ref_start_ix != token.ref_end_ix) // respect complex values
					pos_test = token.start <= selStart;
				
				if (!pos_test) continue;
				
				// found token that should be selected
				if (token.type == 'identifier') {
					var rule_sel = handleFullRuleCSS(tokens, i, token.start);
					if (rule_sel) return rule_sel;
				} else if (token.type == 'value' && token.ref_start_ix != token.ref_end_ix) {
					// looks like a complex value
					var children = token.children;
					for (var j = children.length - 1; j >= 0; j--) {
						if (children[j][0] < selStart) {
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
		if (m = text.match(/^[\w\-]+\(['"]?/)) {
			start += m[0].length;
			if (m = text.match(/['"]?\)$/))
				end -= m[0].length;
		}
		
		return [start, end];
	}
	
	// XXX register actions
	var actions = zen_coding.require('actions');
	actions.add('select_next_item', function(editor){
		if (editor.getSyntax() == 'css')
			return findNextCSSItem(editor);
		else
			return findNextHTMLItem(editor);
	});
	
	actions.add('select_previous_item', function(editor){
		if (editor.getSyntax() == 'css')
			return findPrevCSSItem(editor);
		else
			return findPrevHTMLItem(editor);
	});
})();