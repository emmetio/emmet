/**
 * Layer that binds Zen Coding's actions to editArea
 *
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 *
 * @include "zen_coding.js"
 * @include "html_matcher.js"
 */

var EditArea_zencoding = (function() {
	/** @type {EditArea}  Current editor's instance */
	var editor = null,
		editor_id = 0,
		is_mac = (/mac\s+os/i.test(navigator.userAgent));

	/**
	 * Return true if Alt key is pressed
	 * @param {Event} evt
	 * @return {Boolean}
	 */
	function AltPressed(e) {
		if (window.event)
			return (window.event.altKey);
		else
			return e.modifiers ? (e.altKey || (e.modifiers % 2)) : e.altKey;
	};

	/**
	 * Return true if Ctrl key is pressed
	 * @return {Boolean}
	 */
	function CtrlPressed(e) {
		// as usual, Opera brings few "suprises" here
		if (window.event && !is_mac) {
			return (window.event.ctrlKey);
		} else {
			return (e.ctrlKey || (e.metaKey && window.opera) || (e.modifiers==2) || (e.modifiers==3) || (e.modifiers>5));
		}
	};

	/**
	 * Return true if Shift key is pressed
	 * @return {Boolean}
	 */
	function ShiftPressed(e) {
		if (window.event) {
			return (window.event.shiftKey);
		} else {
			return (e.shiftKey || (e.modifiers>3));
		}
	};

	/**
	 * Finds abbreviation in cucrrent editor and returns it
	 * @return {String|null}
	 */
	function findAbbreviation() {
		var range = editor.getSelectionRange(editor_id);
		if (range.start != range.end) {
			// abbreviation is selected by user
			return editor.getSelectedText(editor_id);
		} else {
			var content = editor.getValue(editor_id);
			return zen_coding.extractAbbreviation(content.substring(0, range.start));
		}
	}

	/**
	 * Returns full line on text for passed character position
	 */
	function getLine(char_pos) {
		var content = editor.getValue(editor_id),
			start_ix = char_pos,
			end_ix,
			ch;

		function isNewline(ch) {
			return ch == '\n' || ch == '\r';
		}

		// find the beginnig of the line
		while (start_ix--) {
			if (isNewline(content.charAt(start_ix))) {
				start_ix++;
				break;
			}
		}

		// find the end of the line
		for (end_ix = char_pos; end_ix < content.length; end_ix++) {
			if (isNewline(content.charAt(end_ix)))
				break;
		}

		return content.substring(start_ix, end_ix);
	}

	/**
	 * Returns padding of current editor's line
	 * @return {String}
	 */
	function getCurrentLinePadding() {
		var range = editor.getSelectionRange(editor_id),
			cur_line = getLine(range.start);

		return (cur_line.match(/^(\s+)/) || [''])[0];
	}

	/**
	 * Replaces current editor's substring with new content. Multiline content
	 * will be automatically padded
	 *
	 * @param {String} editor_str Current editor's substring
	 * @param {String} content New content
	 */
	function replaceEditorContent(editor_str, content) {
		if (!content)
			return;

		// add padding for current line
		content = zen_coding.padString(content, getCurrentLinePadding());

		// get char index where we need to place cursor
		var range = editor.getSelectionRange(editor_id);
		var start_pos = range.end - editor_str.length;
		var cursor_pos = content.indexOf('|');
		content = content.replace(/\|/g, '');

		// replace content in editor
		editor.setSelectionRange(editor_id, start_pos, start_pos + editor_str.length);
		editor.setSelectedText(editor_id, content);

		// place cursor
		if (cursor_pos != -1)
			editor.setSelectionRange(editor_id, start_pos + cursor_pos, start_pos + cursor_pos);
	}

	/**
	 * Search for the new edit point
	 * @param {Number} Search direction: -1 — left, 1 — right
	 * @param {Number} Initial offset from the current caret position
	 * @return {Number} Returns -1 if edit point wasn't found
	 */
	function findNewEditPoint(inc, offset) {
		inc = inc || 1;
		offset = offset || 0;
		var content = editor.getValue(editor_id),
			cur_point = editor.getSelectionRange(editor_id).start + offset,
			max_len = content.length,
			next_point = -1;

		function ch(ix) {
			return content.charAt(ix);
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
			}

			if (next_point != -1)
				break;
		}

		return next_point;
	}

	/**
	 * Unindent content, thus preparing text for tag wrapping
	 * @param {String} text
	 * @return {String}
	 */
	function unindent(text) {
		var pad = getCurrentLinePadding();
		var lines = zen_coding.splitByLines(text);
		for (var i = 0; i < lines.length; i++) {
			if (lines[i].search(pad) == 0)
				lines[i] = lines[i].substr(pad.length);
		}

		return lines.join(zen_coding.getNewline());
	}

	/**
	 * Wraps content with abbreviation
	 * @param {String} editor_type
	 * @param {String} profile_name
	 */
	function mainWrapWithAbbreviation(editor_type, profile_name) {
		profile_name = profile_name || 'xhtml';

		var range = editor.getSelectionRange(editor_id),
			content = editor.getValue(editor_id),
			start_offset = range.start,
			end_offset = range.end,

			abbr = prompt('Enter abbreviation');

		if (!abbr)
			return null;

		if (start_offset == end_offset) {
			// no selection, find tag pair
			var range = HTMLPairMatcher(content, Math.max(start_offset, end_offset));

			if (!range || range[0] == -1) // nothing to wrap
				return null;
				
			start_offset = range[0];
			end_offset = range[1];
				
			// narrow down selection until first non-space character
			var re_space = /\s|\n|\r/;
			function isSpace(ch) {
				return re_space.test(ch);
			}
			
			while (start_offset < end_offset) {
				if (!isSpace(content.charAt(start_offset)))
					break;
					
				start_offset++;
			}
			
			while (end_offset > start_offset) {
				end_offset--;
				if (!isSpace(content.charAt(end_offset))) {
					end_offset++;
					break;
				}
			}
		}

		var content = content.substring(start_offset, end_offset),
			result = zen_coding.wrapWithAbbreviation(abbr, unindent(content), editor_type, profile_name);

		if (result) {
			editor.setSelectionRange(editor_id, end_offset, end_offset);
			replaceEditorContent(content, result);
		}
	}

	/**
	 * Performs Zen Coding action on keydown event
	 * @param {Event} evt
	 */
	function keyDown(evt) {
		evt = evt || window.event;
		var letter = String.fromCharCode(evt.keyCode).toLowerCase(),
			stop_event = false;

		if (CtrlPressed(evt) && !AltPressed(evt) && !ShiftPressed(evt)) {
			switch (evt.keyCode) {
				case 188: // Ctrl+, — expand abbreviation
				case 44:
					var abbr = findAbbreviation();
					if (abbr) {
						var profile_name = 'xhtml',
							syntax = (editArea.current_code_lang in zen_settings) ? editArea.current_code_lang : 'html';

						var content = zen_coding.expandAbbreviation(abbr, syntax, profile_name);
						replaceEditorContent(abbr, content);
					}
					stop_event = true;
					break;
				case 77: // Ctrl+M — match pair
				case 109:
					var selection = editor.getSelectionRange(editor_id),
						range = HTMLPairMatcher(editor.getValue(editor_id), Math.max(selection.start, selection.end));

					if (range && range[0] != -1)
						editor.setSelectionRange(editor_id, range[0], range[1]);

					stop_event = true;
					break;
				case 72: // Ctrl+H — wrap with abbreviation
					mainWrapWithAbbreviation('html', 'xhtml');

					stop_event = true;
					break;
			}
		}

		if (CtrlPressed(evt) && !AltPressed(evt) && ShiftPressed(evt)) {
			switch (evt.keyCode) {
				case 37: // Ctrl+Shift+LEFT_ARROW – prev edit point
					var new_point = findNewEditPoint(-1),
						range = editor.getSelectionRange(editor_id);


					if (new_point == range.start)
						// returned to the current position, start searching from the new one
						new_point = findNewEditPoint(-1, -2);

					if (new_point != -1)
						editor.setSelectionRange(editor_id, new_point, new_point);

					stop_event = true;
					break;

				case 39: // Shift+Ctrl+RIGHT_ARROW – next edit point
					var new_point = findNewEditPoint(1);
					if (new_point != -1)
						editor.setSelectionRange(editor_id, new_point, new_point);

					stop_event = true;
					break;

				case 38: // Shift+Ctrl+UP_ARROW – go to matching pair
					var caret_pos = editor.getSelectionRange(editor_id).start,
						content = editor.getValue(editor_id);

					if (content.charAt(caret_pos) == '<')
						// looks like caret is outside of tag pair
						caret_pos++;

					var range = HTMLPairMatcher(content, caret_pos);

					if (range && range[0] != -1) {
						// match found
						var open_tag = HTMLPairMatcher.last_match.opening_tag,
							close_tag = HTMLPairMatcher.last_match.closing_tag;

						if (close_tag) { // exclude unary tags
							var new_pos = -1;
							if (open_tag.start <= caret_pos && open_tag.end >= caret_pos)
								new_pos = close_tag.start
							else if (close_tag.start <= caret_pos && close_tag.end >= caret_pos)
								new_pos = open_tag.start;

							if (new_pos != -1)
								editor.setSelectionRange(editor_id, new_pos, new_pos);
						}
					}

					stop_event = true;
					break;

				case 77: // Shift+Ctrl+M — merge lines
					var range = editor.getSelectionRange(editor_id),
						content = editor.getValue(editor_id),
						start_ix = range.start,
						end_ix = range.end;

					if (start_ix == end_ix) {
						// find matching tag
						var pair = HTMLPairMatcher(content, start_ix);
						if (pair) {
							start_ix = pair[0];
							end_ix = pair[1];
						}
					}

					if (start_ix != end_ix) {
						// got range, merge lines
						var text = content.substring(start_ix, end_ix),
							old_text = text;

						var lines = text.split(/(\r|\n)/);

						for (var i = 1; i < lines.length; i++) {
							lines[i] = lines[i].replace(/^\s+/, '');
						}

						text = lines.join('').replace(/\s{2,}/, ' ');

						editor.setSelectionRange(editor_id, end_ix, end_ix);
						replaceEditorContent(old_text, text);
					}

					stop_event = true;
					break;

			}
		}

		if(stop_event){
			// in case of a control that sould'nt be used by IE but that is used => THROW a javascript error that will stop key action
			if(window.event) evt.keyCode = 0;

			return false;
		}

		return true;

	}

	return {
		init: function() {
			editArea.load_script(this.baseURL+"core.js");
		},

		onkeydown: function(evt) {
			editor = parent.editAreaLoader;
			editor_id = editArea.id;

			return keyDown(evt);
		}
	}
})();

editArea.add_plugin("zencoding", EditArea_zencoding);