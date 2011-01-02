/**
 * Actions that use stream parses and tokenizers:
 * -- Search for next/previuos items in HTML
 * 
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * 
 * @include "../zen_editor.js"
 * @include "utils.js"
 * @include "stringstream.js"
 * @include "parsexml.js"
 * @include "tokenize.js"
 * @include "../html_matcher.js"
 */
(function(){
	var start_tag = /^<([\w\:\-]+)((?:\s+[\w\-:]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/,
		known_types = {
			'xml-tagname': 1,
			'xml-attname': 1,
			'xml-attribute': 1
		};
	
	/**
	 * Find next HTML item
	 * @param {zen_editor} editor
	 */
	function findNextHTMLItem(editor) {
		var content = String(editor.getContent()),
			c_len = content.length,
			tag,
			tag_def,
			rng,
			sel = editor.getSelectionRange(),
			sel_start = Math.min(sel.start, sel.end),
			sel_end = Math.max(sel.start, sel.end);
			
		// find tag under caret
		var search_pos = sel_start;
		tag = findOpeningTagFromPosition(content, sel_start);
		
		if (tag && sel_start >= tag[0] && sel_start <= tag[1]) {
			tag_def = content.substring(tag[0], tag[1]);
			rng = getRangeForNextItemInHTML(tag_def, tag[0], sel_start, sel_end);
				
			if (rng) {
				editor.createSelection(rng[0], rng[1]);
				return true;
			}
		}
		
		// if we're here then no selection in tag under cursor,
		// search right until we find opening tag
		while (search_pos < c_len) {
			if ( (tag = getOpeningTagFromPosition(content, search_pos)) ) {
				// found something that looks like opening tag
				tag_def = content.substring(tag[0], tag[1]);
				rng = getRangeForNextItemInHTML(tag_def, tag[0], sel_start, sel_end);
					
				if (rng) {
					editor.createSelection(rng[0], rng[1]);
					return true;
				} else {
					search_pos = tag[1];
				}
			}
			
			search_pos++;
		}
		
		return false;
	}
	
	/**
	 * Find previous HTML item
	 * @param {zen_editor} editor
	 */
	function findPrevHTMLItem(editor) {
		var content = String(editor.getContent()),
			c_len = content.length,
			tag,
			tag_def,
			rng,
			sel = editor.getSelectionRange(),
			sel_start = Math.min(sel.start, sel.end),
			sel_end = Math.max(sel.start, sel.end);
			
		// find tag under caret
		var search_pos = sel_start;
		
		// search left until we find opening tag
		while (search_pos >= 0) {
			if ( (tag = getOpeningTagFromPosition(content, search_pos)) ) {
				// found something that looks like opening tag
				tag_def = content.substring(tag[0], tag[1]);
				rng = getRangeForPrevItemInHTML(tag_def, tag[0], sel_start, sel_end);
					
				if (rng) {
					editor.createSelection(rng[0], rng[1]);
					return true;
				}
			}
			
			search_pos--;
		}
		
		return false;
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
		var tokens = parseTagDef(tag, offset),
			next_sel_start = -1,
			next_sel_end = -1;
				
		// search for token that is right to selection
		for (var i = 0, il = tokens.length; i < il; i++) {
			/** @type {tagDef} */
			var token = tokens[i], pos_test;
			if (token.type in known_types) {
				// check token position
				pos_test = token.start >= sel_start;
				if (token.type == 'xml-attribute' && isQuote(token.content.charAt(0))) {
					pos_test = token.start + 1 >= sel_start && token.end -1 != sel_end;
				}
				
				if (!pos_test) continue;
				
				// found token that should be selected
				if (token.type == 'xml-attname') {
					if (sel_end <= token.end)
						next_sel_start = token.start;
					
					for (var j = i + 1; j < il; j++) {
						/** @type {tagDef} */
						var _t = tokens[j];
						if (_t.type == 'xml-attribute') {
							next_sel_end = _t.end;
							if (next_sel_start == -1) {
								next_sel_start = _t.start;
								
								if (isQuote(_t.content.charAt(0)))
									next_sel_start++;
								if (isQuote(_t.content.charAt(_t.content.length - 1)))
									next_sel_end--;
							}	
							break;
						} else if (_t.type == 'xml-attname') {
							// moved to next attribute, adjust selection
							next_sel_start = _t.start;
							next_sel_end = _t.end;
						}
					}
						
					if (next_sel_start != -1 && next_sel_end != -1) {
						return [next_sel_start, next_sel_end];
					}
				} else if (token.end > sel_end) {
					next_sel_start = token.start;
					next_sel_end = token.end;
					
					if (token.type == 'xml-attribute') {
						if (isQuote(token.content.charAt(0)))
							next_sel_start++;
						if (isQuote(token.content.charAt(token.content.length - 1)))
							next_sel_end--;
					}
					
					return [next_sel_start, next_sel_end];
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
		var tokens = parseTagDef(tag, offset),
			next_sel_start = -1,
			next_sel_end = -1;
				
		// search for token that is left to the selection
		for (var i = tokens.length - 1, il = tokens.length; i >= 0; i--) {
			/** @type {tagDef} */
			var token = tokens[i], pos_test;
			if (token.type in known_types) {
				// check token position
				pos_test = token.start < sel_start;
				if (token.type == 'xml-attribute' && isQuote(token.content.charAt(0))) {
					pos_test = token.start + 1 < sel_start;
				}
				
				if (!pos_test) continue;
				
				// found token that should be selected
				if (token.type == 'xml-attname') {
					next_sel_start = token.start;
					
					for (var j = i + 1; j < il; j++) {
						/** @type {tagDef} */
						var _t = tokens[j];
						if (_t.type == 'xml-attribute') {
							next_sel_end = _t.end;
							if (next_sel_start == -1) {
								next_sel_start = _t.start;
								
								if (isQuote(_t.content.charAt(0)))
									next_sel_start++;
								if (isQuote(_t.content.charAt(_t.content.length - 1)))
									next_sel_end--;
							}	
							break;
						} else if (_t.type == 'xml-attname') {
							// moved to next attribute, adjust selection
							next_sel_end = token.end;
						}
					}
						
					if (next_sel_start != -1 && next_sel_end != -1) {
						return [next_sel_start, next_sel_end];
					}
				} else {
					next_sel_start = token.start;
					next_sel_end = token.end;
					
					if (token.type == 'xml-attribute') {
						if (isQuote(token.content.charAt(0)))
							next_sel_start++;
						if (isQuote(token.content.charAt(token.content.length - 1)))
							next_sel_end--;
					}
					
					return [next_sel_start, next_sel_end];
				}
			}
		}
		
		return null;
	}
	
	function tagDef(pos, obj) {
		return {
			type: obj.style, 
			content: obj.content,
			start: pos,
			end: pos + obj.content.length
		};
	}
	
	/**
	 * Parses tag definiton, saving each token's position
	 * @param {String} tag Tag to parse
	 * @param {Number} offset Index offset
	 * @return {tagDef[]}
	 */
	function parseTagDef(tag, offset) {
		var tokens = XMLParser.make(tag),
			result = [],
			t, i = 0;
			
		try {
			while (t = tokens.next()) {
				result.push(tagDef(offset + i, t));
				i += t.value.length;
			}
		} catch (e) {
			if (e != StopIteration) throw e;
		}
		
		return result;
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
	
	zen_coding.registerAction('select_next_item', findNextHTMLItem);
	zen_coding.registerAction('select_previous_item', findPrevHTMLItem);
})();