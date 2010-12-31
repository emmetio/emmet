/**
 * Search for next/previuos items in HTML and CSS files
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * 
 * @include "../zen_editor.js"
 * @include "utils.js"
 * @include "stringstream.js"
 * @include "parsexml.js"
 * @include "tokenize.js"
 */
 
/**
 * Find next HTML item
 * @param {zen_editor} editor
 */function findNextHTMLItem(editor) {
	var content = String(editor.getContent()),
		sel = editor.getSelectionRange(),
		sel_start = Math.min(sel.start, sel.end),
		sel_end = Math.max(sel.start, sel.end),
		syntax = String(editor.getProfileName()).toLowerCase(),
		known_types = {
			'xml-tagname': 1,
			'xml-attname': 1,
			'xml-attribute': 1
		},
		next_sel_start = -1,
		next_sel_end = -1;
		
	if (syntax != 'html' && syntax != 'xhtml')
		syntax = 'xhtml';
	
	var tags = zen_coding.html_matcher.getTags(content, sel_end, syntax);
	if (tags[0]) {
		var tag_def = content.substring(tags[0].start, tags[0].end),
			tokens = parseTagDef(tag_def, tags[0].start);
			
		// search for token that is right to selection
		for (var i = 0, il = tokens.length; i < il; i++) {
			/** @type {tagDef} */
			var token = tokens[i];
			if (token.type in known_types && token.start >= sel_start) {
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
						editor.createSelection(next_sel_start, next_sel_end);
						return true;
					}
				} else if (token.end > sel_end) {
					editor.createSelection(token.start, token.end);
					return true;
				}
			}
		}
	}
	
	console.log('no item found');
	return false;
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

function isQuote(ch) {
	return ch == '"' || ch == "'";
}

zen_coding.registerAction('select_next_item', findNextHTMLItem);