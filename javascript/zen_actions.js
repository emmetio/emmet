/**
 * Middleware layer that communicates between editor and Zen Coding.
 * This layer describes all available Zen Coding actions, like 
 * "Expand Abbreviation".
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * 
 * @include "zen_editor.js"
 * @include "html_matcher.js"
 * @include "zen_coding.js"
 * @include "zen_file.js"
 * @include "base64.js"
 */

/**
 * Search for abbreviation in editor from current caret position
 * @param {zen_editor} editor Editor instance
 * @return {String|null}
 */
function findAbbreviation(editor) {
	var range = editor.getSelectionRange(),
		content = String(editor.getContent());
	if (range.start != range.end) {
		// abbreviation is selected by user
		return content.substring(range.start, range.end);
	}
	
	// search for new abbreviation from current caret position
	var cur_line = editor.getCurrentLineRange();
	return zen_coding.extractAbbreviation(content.substring(cur_line.start, range.start));
}

/**
 * Find from current caret position and expand abbreviation in editor
 * @param {zen_editor} editor Editor instance
 * @param {String} [syntax] Syntax type (html, css, etc.)
 * @param {String} [profile_name] Output profile name (html, xml, xhtml)
 * @return {Boolean} Returns <code>true</code> if abbreviation was expanded 
 * successfully
 */
function expandAbbreviation(editor, syntax, profile_name) {
	syntax = String(syntax || editor.getSyntax());
	profile_name = String(profile_name || editor.getProfileName());
	
	var caret_pos = editor.getSelectionRange().end,
		abbr,
		content = '';
		
	if ( (abbr = findAbbreviation(editor)) ) {
		content = zen_coding.expandAbbreviation(abbr, syntax, profile_name);
		if (content) {
			editor.replaceContent(content, caret_pos - abbr.length, caret_pos);
			return true;
		}
	}
	
	return false;
}

/**
 * A special version of <code>expandAbbreviation</code> function: if it can't
 * find abbreviation, it will place Tab character at caret position
 * @param {zen_editor} editor Editor instance
 * @param {String} syntax Syntax type (html, css, etc.)
 * @param {String} profile_name Output profile name (html, xml, xhtml)
 */
function expandAbbreviationWithTab(editor, syntax, profile_name) {
	syntax = String(syntax || editor.getSyntax());
	profile_name = String(profile_name || editor.getProfileName());
	if (!expandAbbreviation(editor, syntax, profile_name))
		editor.replaceContent(zen_coding.getVariable('indentation'), editor.getCaretPos());
}

/**
 * Find and select HTML tag pair
 * @param {zen_editor} editor Editor instance
 * @param {String} [direction] Direction of pair matching: 'in' or 'out'. 
 * Default is 'out'
 */
function matchPair(editor, direction, syntax) {
	direction = String((direction || 'out').toLowerCase());
	syntax = String(syntax || editor.getProfileName());
	
	var range = editor.getSelectionRange(),
		cursor = range.end,
		range_start = range.start, 
		range_end = range.end,
//		content = zen_coding.splitByLines(editor.getContent()).join('\n'),
		content = String(editor.getContent()),
		range = null,
		_r,
	
		old_open_tag = zen_coding.html_matcher.last_match['opening_tag'],
		old_close_tag = zen_coding.html_matcher.last_match['closing_tag'];
		
	if (direction == 'in' && old_open_tag && range_start != range_end) {
//		user has previously selected tag and wants to move inward
		if (!old_close_tag) {
//			unary tag was selected, can't move inward
			return false;
		} else if (old_open_tag.start == range_start) {
			if (content.charAt(old_open_tag.end) == '<') {
//				test if the first inward tag matches the entire parent tag's content
				_r = zen_coding.html_matcher.find(content, old_open_tag.end + 1, syntax);
				if (_r[0] == old_open_tag.end && _r[1] == old_close_tag.start) {
					range = zen_coding.html_matcher(content, old_open_tag.end + 1, syntax);
				} else {
					range = [old_open_tag.end, old_close_tag.start];
				}
			} else {
				range = [old_open_tag.end, old_close_tag.start];
			}
		} else {
			var new_cursor = content.substring(0, old_close_tag.start).indexOf('<', old_open_tag.end);
			var search_pos = new_cursor != -1 ? new_cursor + 1 : old_open_tag.end;
			range = zen_coding.html_matcher(content, search_pos, syntax);
		}
	} else {
		range = zen_coding.html_matcher(content, cursor, syntax);
	}
	
	if (range !== null && range[0] != -1) {
		editor.createSelection(range[0], range[1]);
		return true;
	} else {
		return false;
	}
}

/**
 * Narrow down text indexes, adjusting selection to non-space characters
 * @param {String} text
 * @param {Number} start
 * @param {Number} end
 * @return {Array}
 */
function narrowToNonSpace(text, start, end) {
	// narrow down selection until first non-space character
	var re_space = /\s|\n|\r/;
	function isSpace(ch) {
		return re_space.test(ch);
	}
	
	while (start < end) {
		if (!isSpace(text.charAt(start)))
			break;
			
		start++;
	}
	
	while (end > start) {
		end--;
		if (!isSpace(text.charAt(end))) {
			end++;
			break;
		}
	}
	
	return [start, end];
}

/**
 * Wraps content with abbreviation
 * @param {zen_editor} Editor instance
 * @param {String} abbr Abbreviation to wrap with
 * @param {String} [syntax] Syntax type (html, css, etc.)
 * @param {String} [profile_name] Output profile name (html, xml, xhtml)
 */
function wrapWithAbbreviation(editor, abbr, syntax, profile_name) {
	syntax = String(syntax || editor.getSyntax());
	profile_name = String(profile_name || editor.getProfileName());
	abbr = String(abbr || editor.prompt("Enter abbreviation"));
	
	var range = editor.getSelectionRange(),
		start_offset = range.start,
		end_offset = range.end,
		content = String(editor.getContent());
		
		
	if (!abbr)
		return null; 
	
	if (start_offset == end_offset) {
		// no selection, find tag pair
		range = zen_coding.html_matcher(content, start_offset, profile_name);
		
		if (!range || range[0] == -1) // nothing to wrap
			return null;
		
		var narrowed_sel = narrowToNonSpace(content, range[0], range[1]);
		
		start_offset = narrowed_sel[0];
		end_offset = narrowed_sel[1];
	}
	
	var new_content = content.substring(start_offset, end_offset),
		result = zen_coding.wrapWithAbbreviation(abbr, unindent(editor, new_content), syntax, profile_name);
	
	if (result) {
		editor.setCaretPos(end_offset);
		editor.replaceContent(result, start_offset, end_offset);
	}
}

/**
 * Unindent content, thus preparing text for tag wrapping
 * @param {zen_editor} editor Editor instance
 * @param {String} text
 * @return {String}
 */
function unindent(editor, text) {
	return unindentText(text, getCurrentLinePadding(editor));
}

/**
 * Removes padding at the beginning of each text's line
 * @param {String} text
 * @param {String} pad
 */
function unindentText(text, pad) {
	var lines = zen_coding.splitByLines(text);
	for (var i = 0; i < lines.length; i++) {
		if (lines[i].search(pad) == 0)
			lines[i] = lines[i].substr(pad.length);
	}
	
	return lines.join(zen_coding.getNewline());
}

/**
 * Returns padding of current editor's line
 * @param {zen_editor} Editor instance
 * @return {String}
 */
function getCurrentLinePadding(editor) {
	return getLinePadding(editor.getCurrentLine());
}

/**
 * Returns line padding
 * @param {String} line
 * @return {String}
 */
function getLinePadding(line) {
	return (line.match(/^(\s+)/) || [''])[0];
}

/**
 * Search for new caret insertion point
 * @param {zen_editor} editor Editor instance
 * @param {Number} inc Search increment: -1 — search left, 1 — search right
 * @param {Number} offset Initial offset relative to current caret position
 * @return {Number} Returns -1 if insertion point wasn't found
 */
function findNewEditPoint(editor, inc, offset) {
	inc = inc || 1;
	offset = offset || 0;
	var cur_point = editor.getCaretPos() + offset,
		content = String(editor.getContent()),
		max_len = content.length,
		next_point = -1,
		re_empty_line = /^\s+$/;
	
	function ch(ix) {
		return content.charAt(ix);
	}
	
	function getLine(ix) {
		var start = ix;
		while (start >= 0) {
			var c = ch(start);
			if (c == '\n' || c == '\r')
				break;
			start--;
		}
		
		return content.substring(start, ix);
	}
		
	while (cur_point < max_len && cur_point > 0) {
		cur_point += inc;
		var cur_char = ch(cur_point),
			next_char = ch(cur_point + 1),
			prev_char = ch(cur_point - 1);
			
		switch (cur_char) {
			case '"':
			case '\'':
				if (next_char == cur_char && prev_char == '=') {
					// empty attribute
					next_point = cur_point + 1;
				}
				break;
			case '>':
				if (next_char == '<') {
					// between tags
					next_point = cur_point + 1;
				}
				break;
			case '\n':
			case '\r':
				// empty line
				if (re_empty_line.test(getLine(cur_point - 1))) {
					next_point = cur_point;
				}
				break;
		}
		
		if (next_point != -1)
			break;
	}
	
	return next_point;
}

/**
 * Move caret to previous edit point
 * @param {zen_editor} editor Editor instance
 */
function prevEditPoint(editor) {
	var cur_pos = editor.getCaretPos(),
		new_point = findNewEditPoint(editor, -1);
		
	if (new_point == cur_pos)
		// we're still in the same point, try searching from the other place
		new_point = findNewEditPoint(editor, -1, -2);
	
	if (new_point != -1) 
		editor.setCaretPos(new_point);
}

/**
 * Move caret to next edit point
 * @param {zen_editor} editor Editor instance
 */
function nextEditPoint(editor) {
	var new_point = findNewEditPoint(editor, 1);
	if (new_point != -1)
		editor.setCaretPos(new_point);
}

/**
 * Inserts newline character with proper indentation
 * @param {zen_editor} editor Editor instance
 * @param {String} mode Syntax mode (only 'html' is implemented)
 */
function insertFormattedNewline(editor, mode) {
	mode = String(mode || 'html');
	var caret_pos = editor.getCaretPos(),
		nl = zen_coding.getNewline(),
		pad = zen_coding.getVariable('indentation');
		
	switch (mode) {
		case 'html':
			// let's see if we're breaking newly created tag
			var pair = zen_coding.html_matcher.getTags(String(editor.getContent()), editor.getCaretPos(), String(editor.getProfileName()));
			
			if (pair[0] && pair[1] && pair[0].type == 'tag' && pair[0].end == caret_pos && pair[1].start == caret_pos) {
				editor.replaceContent(nl + pad + zen_coding.getCaretPlaceholder() + nl, caret_pos);
			} else {
				editor.replaceContent(nl, caret_pos);
			}
			break;
		default:
			editor.replaceContent(nl, caret_pos);
	}
}

/**
 * Select line under cursor
 * @param {zen_editor} editor Editor instance
 */
function selectLine(editor) {
	var range = editor.getCurrentLineRange();
	editor.createSelection(range.start, range.end);
}

/**
 * Moves caret to matching opening or closing tag
 * @param {zen_editor} editor
 */
function goToMatchingPair(editor) {
	var content = String(editor.getContent()),
		caret_pos = editor.getCaretPos();
	
	if (content.charAt(caret_pos) == '<') 
		// looks like caret is outside of tag pair  
		caret_pos++;
		
	var tags = zen_coding.html_matcher.getTags(content, caret_pos, String(editor.getProfileName()));
		
	if (tags && tags[0]) {
		// match found
		var open_tag = tags[0],
			close_tag = tags[1];
			
		if (close_tag) { // exclude unary tags
			if (open_tag.start <= caret_pos && open_tag.end >= caret_pos)
				editor.setCaretPos(close_tag.start);
			else if (close_tag.start <= caret_pos && close_tag.end >= caret_pos)
				editor.setCaretPos(open_tag.start);
		}
	}
}

/**
 * Merge lines spanned by user selection. If there's no selection, tries to find
 * matching tags and use them as selection
 * @param {zen_editor} editor
 */
function mergeLines(editor) {
	var selection = editor.getSelectionRange();
	if (selection.start == selection.end) {
		// find matching tag
		var pair = zen_coding.html_matcher(String(editor.getContent()), editor.getCaretPos(), String(editor.getProfileName()));
		if (pair) {
			selection.start = pair[0];
			selection.end = pair[1];
		}
	}
	
	if (selection.start != selection.end) {
		// got range, merge lines
		var text = String(editor.getContent()).substring(selection.start, selection.end),
			old_length = text.length;
		var lines =  zen_coding.splitByLines(text);
		
		for (var i = 1; i < lines.length; i++) {
			lines[i] = lines[i].replace(/^\s+/, '');
		}
		
		text = lines.join('').replace(/\s{2,}/, ' ');
		editor.replaceContent(text, selection.start, selection.end);
		editor.createSelection(selection.start, selection.start + text.length);
	}
}

/**
 * Toggle comment on current editor's selection or HTML tag/CSS rule
 * @param {zen_editor} editor
 */
function toggleComment(editor) {
	switch (editor.getSyntax()) {
		case 'css':
			return toggleCSSComment(editor);
		default:
			return toggleHTMLComment(editor);
	}
}

/**
 * Toggle HTML comment on current selection or tag
 * @param {zen_editor} editor
 * @return {Boolean} Returns <code>true</code> if comment was toggled
 */
function toggleHTMLComment(editor) {
	var rng = editor.getSelectionRange(),
		content = String(editor.getContent());
		
	if (rng.start == rng.end) {
		// no selection, find matching tag
		var pair = zen_coding.html_matcher.getTags(content, editor.getCaretPos(), String(editor.getProfileName()));
		if (pair && pair[0]) { // found pair
			rng.start = pair[0].start;
			rng.end = pair[1] ? pair[1].end : pair[0].end;
		}
	}
	
	return genericCommentToggle(editor, '<!--', '-->', rng.start, rng.end);
}

/**
 * Simple CSS commenting
 * @param {zen_editor} editor
 * @return {Boolean} Returns <code>true</code> if comment was toggled
 */
function toggleCSSComment(editor) {
	var rng = editor.getSelectionRange();
		
	if (rng.start == rng.end) {
		// no selection, get current line
		rng = editor.getCurrentLineRange();

		// adjust start index till first non-space character
		var _r = narrowToNonSpace(String(editor.getContent()), rng.start, rng.end);
		rng.start = _r[0];
		rng.end = _r[1];
	}
	
	return genericCommentToggle(editor, '/*', '*/', rng.start, rng.end);
}

/**
 * Search for nearest comment in <code>str</code>, starting from index <code>from</code>
 * @param {String} text Where to search
 * @param {Number} from Search start index
 * @param {String} start_token Comment start string
 * @param {String} end_token Comment end string
 * @return {Array|null} Returns null if comment wasn't found
 */
function searchComment(text, from, start_token, end_token) {
	var start_ch = start_token.charAt(0),
		end_ch = end_token.charAt(0),
		comment_start = -1,
		comment_end = -1;
	
	function hasMatch(str, start) {
		return text.substr(start, str.length) == str;
	}
		
	// search for comment start
	while (from--) {
		if (text.charAt(from) == start_ch && hasMatch(start_token, from)) {
			comment_start = from;
			break;
		}
	}
	
	if (comment_start != -1) {
		// search for comment end
		from = comment_start;
		var content_len = text.length;
		while (content_len >= from++) {
			if (text.charAt(from) == end_ch && hasMatch(end_token, from)) {
				comment_end = from + end_token.length;
				break;
			}
		}
	}
	
	return (comment_start != -1 && comment_end != -1) 
		? [comment_start, comment_end] 
		: null;
}

/**
 * Escape special regexp chars in string, making it usable for creating dynamic
 * regular expressions
 * @param {String} str
 * @return {String}
 */
function escapeForRegexp(str) {
  var specials = new RegExp("[.*+?|()\\[\\]{}\\\\]", "g"); // .*+?|()[]{}\
  return str.replace(specials, "\\$&");
}

/**
 * Generic comment toggling routine
 * @param {zen_editor} editor
 * @param {String} comment_start Comment start token
 * @param {String} comment_end Comment end token
 * @param {Number} range_start Start selection range
 * @param {Number} range_end End selection range
 * @return {Boolean}
 */
function genericCommentToggle(editor, comment_start, comment_end, range_start, range_end) {
	var content = editor.getContent(),
		caret_pos = editor.getCaretPos(),
		new_content = null;
		
	/**
	 * Remove comment markers from string
	 * @param {Sting} str
	 * @return {String}
	 */
	function removeComment(str) {
		return str
			.replace(new RegExp('^' + escapeForRegexp(comment_start) + '\\s*'), function(str){
				caret_pos -= str.length;
				return '';
			}).replace(new RegExp('\\s*' + escapeForRegexp(comment_end) + '$'), '');
	}
	
	function hasMatch(str, start) {
		return content.substr(start, str.length) == str;
	}
		
	// first, we need to make sure that this substring is not inside 
	// comment
	var comment_range = searchComment(content, caret_pos, comment_start, comment_end);
	
	if (comment_range && comment_range[0] <= range_start && comment_range[1] >= range_end) {
		// we're inside comment, remove it
		range_start = comment_range[0];
		range_end = comment_range[1];
		
		new_content = removeComment(content.substring(range_start, range_end));
	} else {
		// should add comment
		// make sure that there's no comment inside selection
		new_content = comment_start + ' ' + 
			content.substring(range_start, range_end)
				.replace(new RegExp(escapeForRegexp(comment_start) + '\\s*|\\s*' + escapeForRegexp(comment_end), 'g'), '') +
			' ' + comment_end;
			
		// adjust caret position
		caret_pos += comment_start.length + 1;
	}

	// replace editor content
	if (new_content !== null) {
		editor.setCaretPos(range_start);
		editor.replaceContent(unindent(editor, new_content), range_start, range_end);
		editor.setCaretPos(caret_pos);
		return true;
	}
	
	return false;
}

/**
 * Splits or joins tag, e.g. transforms it into a short notation and vice versa:<br>
 * &lt;div&gt;&lt;/div&gt; → &lt;div /&gt; : join<br>
 * &lt;div /&gt; → &lt;div&gt;&lt;/div&gt; : split
 * @param {zen_editor} editor Editor instance
 * @param {String} [profile_name] Profile name
 */
function splitJoinTag(editor, profile_name) {
	var caret_pos = editor.getCaretPos(),
		profile = zen_coding.getProfile(String(profile_name || editor.getProfileName())),
		caret = zen_coding.getCaretPlaceholder();

	// find tag at current position
	var pair = zen_coding.html_matcher.getTags(String(editor.getContent()), caret_pos, String(editor.getProfileName()));
	if (pair && pair[0]) {
		var new_content = pair[0].full_tag;
		
		if (pair[1]) { // join tag
			var closing_slash = ' /';
			if (profile.self_closing_tag === true)
				closing_slash = '/';
				
			new_content = new_content.replace(/\s*>$/, closing_slash + '>');
			
			// add caret placeholder
			if (new_content.length + pair[0].start < caret_pos)
				new_content += caret;
			else {
				var d = caret_pos - pair[0].start;
				new_content = new_content.substring(0, d) + caret + new_content.substring(d);
			}
			
			editor.replaceContent(new_content, pair[0].start, pair[1].end);
		} else { // split tag
			var nl = zen_coding.getNewline(),
				pad = zen_coding.getVariable('indentation');
			
			// define tag content depending on profile
			var tag_content = (profile.tag_nl === true)
					? nl + pad +caret + nl
					: caret;
					
			new_content = new_content.replace(/\s*\/>$/, '>') + tag_content + '</' + pair[0].name + '>';
			editor.replaceContent(new_content, pair[0].start, pair[0].end);
		}
		
		return true;
	} else {
		return false;
	}
}

/**
 * Returns line bounds for specific character position
 * @param {String} text
 * @param {Number} from Where to start searching
 * @return {Object}
 */
function getLineBounds(text, from) {
	var len = text.length,
		start = 0,
		end = len - 1;
	
	// search left
	for (var i = from - 1; i > 0; i--) {
		var ch = text.charAt(i);
		if (ch == '\n' || ch == '\r') {
			start = i + 1;
			break;
		}
	}
	// search right
	for (var j = from; j < len; j++) {
		var ch = text.charAt(j);
		if (ch == '\n' || ch == '\r') {
			end = j;
			break;
		}
	}
	
	return {start: start, end: end};
}

/**
 * Gracefully removes tag under cursor
 * @param {zen_editor} editor
 */
function removeTag(editor) {
	var caret_pos = editor.getCaretPos(),
		content = String(editor.getContent());
		
	// search for tag
	var pair = zen_coding.html_matcher.getTags(content, caret_pos, String(editor.getProfileName()));
	if (pair && pair[0]) {
		if (!pair[1]) {
			// simply remove unary tag
			editor.replaceContent(zen_coding.getCaretPlaceholder(), pair[0].start, pair[0].end);
		} else {
			var tag_content_range = narrowToNonSpace(content, pair[0].end, pair[1].start),
				start_line_bounds = getLineBounds(content, tag_content_range[0]),
				start_line_pad = getLinePadding(content.substring(start_line_bounds.start, start_line_bounds.end)),
				tag_content = content.substring(tag_content_range[0], tag_content_range[1]);
				
			tag_content = unindentText(tag_content, start_line_pad);
			editor.replaceContent(zen_coding.getCaretPlaceholder() + tag_content, pair[0].start, pair[1].end);
		}
		
		return true;
	} else {
		return false;
	}
}

/**
 * Test if <code>text</code> starts with <code>token</code> at <code>pos</code>
 * position. If <code>pos</code> is ommited, search from beginning of text 
 * @param {String} token Token to test
 * @param {String} text Where to search
 * @param {Number} pos Position where to start search
 * @return {Boolean}
 * @since 0.65
 */
function startsWith(token, text, pos) {
	pos = pos || 0;
	return text.charAt(pos) == token.charAt(0) && text.substr(pos, token.length) == token;
}

/**
 * Encodes/decodes image under cursor to/from base64
 * @param {zen_editor} editor
 * @since 0.65
 */
function encodeDecodeBase64(editor) {
	var data = String(editor.getSelection()),
		caret_pos = editor.getCaretPos();
		
	if (!data) {
		// no selection, try to find image bounds from current caret position
		var text = String(editor.getContent()),
			ch, 
			m;
		while (caret_pos-- >= 0) {
			if (startsWith('src=', text, caret_pos)) { // found <img src="">
				if (m = text.substr(caret_pos).match(/^(src=(["'])?)([^'"<>\s]+)\1?/)) {
					data = m[3];
					caret_pos += m[1].length;
				}
				break;
			} else if (startsWith('url(', text, caret_pos)) { // found CSS url() pattern
				if (m = text.substr(caret_pos).match(/^(url\((['"])?)([^'"\)\s]+)\1?/)) {
					data = m[3];
					caret_pos += m[1].length;
				}
				break;
			}
		}
	}
	
	if (data) {
		if (startsWith('data:', data))
			return decodeFromBase64(editor, data, caret_pos);
		else
			return encodeToBase64(editor, data, caret_pos);
	} else {
		return false;
	}
}

/**
 * Encodes image to base64
 * @requires zen_file
 * 
 * @param {zen_editor} editor
 * @param {String} img_path Path to image
 * @param {Number} pos Caret position where image is located in the editor
 * @return {Boolean}
 */
function encodeToBase64(editor, img_path, pos) {
	var editor_file = editor.getFilePath(),
		default_mime_type = 'application/octet-stream';
		
	if (editor_file === null) {
		throw "You should save your file before using this action";
	}
	
	// locate real image path
	var real_img_path = zen_file.locateFile(editor_file, img_path);
	if (real_img_path === null) {
		throw "Can't find " + img_path + ' file';
	}
	
	var b64 = base64.encode(String(zen_file.read(real_img_path)));
	if (!b64) {
		throw "Can't encode file content to base64";
	}
	
	b64 = 'data:' + (base64.mime_types[String(zen_file.getExt(real_img_path))] || default_mime_type) +
		';base64,' + b64;
		
	editor.replaceContent('$0' + b64, pos, pos + img_path.length);
	return true;
}

/**
 * Decodes base64 string back to file.
 * @requires zen_editor.prompt
 * @requires zen_file
 * 
 * @param {zen_editor} editor
 * @param {String} data Base64-encoded file content
 * @param {Number} pos Caret position where image is located in the editor
 */
function decodeFromBase64(editor, data, pos) {
	// ask user to enter path to file
	var file_path = String(editor.prompt('Enter path to file (absolute or relative)'));
	if (!file_path)
		return false;
		
	var abs_path = zen_file.createPath(editor.getFilePath(), file_path);
	if (!abs_path) {
		throw "Can't save file";
	}
	
	zen_file.save(abs_path, base64.decode( data.replace(/^data\:.+?;.+?,/, '') ));
	editor.replaceContent('$0' + file_path, pos, pos + data.length);
	return true;
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

/**
 * Update Image Size actions: reads image from &lt;img src=""&gt; file
 * and updates dimentions inside tag
 * @param {zen_editor} editor
 */
function updateImageSize(editor) {
	var offset = editor.getCaretPos();
		
	var image = findImage(editor);
	if (image) {
		var re = /\bsrc=(["'])(.+?)\1/i, m, src;
		if (m = re.exec(image.tag))
			src = m[2];
		
		if (src) {
			var abs_path = zen_file.locateFile(editor.getFilePath(), src);
			if (abs_path === null) {
				throw "Can't find " + src + ' file';
			}
			
			var size = zen_coding.getImageSize(String(zen_file.read(abs_path)));
			if (size) {
				var new_tag = replaceOrAppend(image.tag, 'width', size.width);
				new_tag = replaceOrAppend(new_tag, 'height', size.height);
				
				editor.replaceContent(new_tag, image.start, image.end);
				editor.setCaretPos(offset);
			}
		}
	}
}

/**
 * Make decimal number look good: convert it to fixed precision end remove
 * traling zeroes 
 * @param {Number} num
 * @param {Number} [fracion] Fraction numbers (default is 2)
 * @return {String}
 */
function prettifyNumber(num, fracion) {
	return num.toFixed(typeof fraction == 'undefined' ? 2 : fracion).replace(/\.?0+$/, '');
}

/**
 * Find expression bounds in current editor at caret position. 
 * On each character a <code>fn</code> function will be caller which must 
 * return <code>true</code> if current character meets requirements, 
 * <code>false</code> otherwise
 * @param {zen_editor} editor
 * @param {Function} fn Function to test each character of expression
 * @requires {Array} If expression found, returns array with start and end 
 * positions 
 */
function findExpressionBounds(editor, fn) {
	var content = String(editor.getContent()),
		il = content.length,
		expr_start = editor.getCaretPos() - 1,
		expr_end = expr_start + 1;
		
	// start by searching left
	while (expr_start >= 0 && fn(content.charAt(expr_start), expr_start, content)) expr_start--;
	
	// then search right
	while (expr_end < il && fn(content.charAt(expr_end), expr_end, content)) expr_end++;
	
	return expr_end > expr_start ? [++expr_start, expr_end] : null;
}

/**
 * Extract number from current caret position of the <code>editor</code> and
 * increment it by <code>step</code>
 * @param {zen_editor} editor
 * @param {Number} step Increment step (may be negative)
 */
function incrementNumber(editor, step) {
	var content = String(editor.getContent()),
		has_sign = false,
		has_decimal = false;
		
	var r = findExpressionBounds(editor, function(ch) {
		if (zen_coding.isNumeric(ch))
			return true;
		if (ch == '.')
			return has_decimal ? false : has_decimal = true;
		if (ch == '-')
			return has_sign ? false : has_sign = true;
			
		return false;
	});
		
	if (r) {
		var num = parseFloat(content.substring(r[0], r[1]));
		if (!isNaN(num)) {
			num = prettifyNumber(num + step);
			editor.replaceContent(num, r[0], r[1]);
			editor.createSelection(r[0], r[0] + num.length);
			return true;
		}
	}
	
	return false;
}

// register all actions
zen_coding.registerAction('expand_abbreviation', expandAbbreviation);
zen_coding.registerAction('expand_abbreviation_with_tab', expandAbbreviationWithTab);
zen_coding.registerAction('match_pair', matchPair);
zen_coding.registerAction('match_pair_inward', function(editor){
	matchPair(editor, 'in');
});

zen_coding.registerAction('match_pair_outward', function(editor){
	matchPair(editor, 'out');
});
zen_coding.registerAction('wrap_with_abbreviation', wrapWithAbbreviation);
zen_coding.registerAction('prev_edit_point', prevEditPoint);
zen_coding.registerAction('next_edit_point', nextEditPoint);
zen_coding.registerAction('insert_formatted_line_break', insertFormattedNewline);
zen_coding.registerAction('select_line', selectLine);
zen_coding.registerAction('matching_pair', goToMatchingPair);
zen_coding.registerAction('merge_lines', mergeLines);
zen_coding.registerAction('toggle_comment', toggleComment);
zen_coding.registerAction('split_join_tag', splitJoinTag);
zen_coding.registerAction('remove_tag', removeTag);
zen_coding.registerAction('encode_decode_data_url', encodeDecodeBase64);
zen_coding.registerAction('update_image_size', updateImageSize);

zen_coding.registerAction('increment_number_by_1', function(editor) {
	return incrementNumber(editor, 1);
});

zen_coding.registerAction('decrement_number_by_1', function(editor) {
	return incrementNumber(editor, -1);
});

zen_coding.registerAction('increment_number_by_10', function(editor) {
	return incrementNumber(editor, 10);
});

zen_coding.registerAction('decrement_number_by_10', function(editor) {
	return incrementNumber(editor, -10);
});

zen_coding.registerAction('increment_number_by_01', function(editor) {
	return incrementNumber(editor, 0.1);
});

zen_coding.registerAction('decrement_number_by_01', function(editor) {
	return incrementNumber(editor, -0.1);
});
