/**
 * HTML pair matching (balancing) actions
 */
(function() {
	/** @type zen_coding.actions */
	var actions = zen_coding.require('actions');
	var matcher = zen_coding.require('html_matcher');
	
	/**
	 * Find and select HTML tag pair
	 * @param {IZenEditor} editor Editor instance
	 * @param {String} direction Direction of pair matching: 'in' or 'out'. 
	 * Default is 'out'
	 */
	function matchPair(editor, direction, syntax) {
		direction = String((direction || 'out').toLowerCase());
		syntax = String(syntax || editor.getProfileName());
		
		var range = editor.getSelectionRange();
		var cursor = range.end;
		var rangeStart = range.start; 
		var rangeEnd = range.end;
		var content = String(editor.getContent());
		var range = null;
		var _r;
		
		var oldOpenTag = matcher.last_match['opening_tag'];
		var oldCloseTag = matcher.last_match['closing_tag'];
			
		if (direction == 'in' && oldOpenTag && rangeStart != rangeEnd) {
//			user has previously selected tag and wants to move inward
			if (!oldCloseTag) {
//				unary tag was selected, can't move inward
				return false;
			} else if (oldOpenTag.start == rangeStart) {
				if (content.charAt(oldOpenTag.end) == '<') {
//					test if the first inward tag matches the entire parent tag's content
					_r = matcher.find(content, oldOpenTag.end + 1, syntax);
					if (_r[0] == oldOpenTag.end && _r[1] == oldCloseTag.start) {
						range = matcher(content, oldOpenTag.end + 1, syntax);
					} else {
						range = [oldOpenTag.end, oldCloseTag.start];
					}
				} else {
					range = [oldOpenTag.end, oldCloseTag.start];
				}
			} else {
				var new_cursor = content.substring(0, oldCloseTag.start).indexOf('<', oldOpenTag.end);
				var search_pos = new_cursor != -1 ? new_cursor + 1 : oldOpenTag.end;
				range = matcher(content, search_pos, syntax);
			}
		} else {
			range = matcher(content, cursor, syntax);
		}
		
		if (range !== null && range[0] != -1) {
			editor.createSelection(range[0], range[1]);
			return true;
		}
		
		return false;
	}
	
	actions.add('match_pair', matchPair);
	actions.add('match_pair_inward', function(editor){
		return matchPair(editor, 'in');
	});

	actions.add('match_pair_outward', function(editor){
		return matchPair(editor, 'out');
	});
	
	/**
	 * Moves caret to matching opening or closing tag
	 * @param {IZenEditor} editor
	 */
	actions.add('matching_pair', function(editor) {
		var content = String(editor.getContent());
		var caretPos = editor.getCaretPos();
		
		if (content.charAt(caretPos) == '<') 
			// looks like caret is outside of tag pair  
			caretPos++;
			
		var tags = matcher.getTags(content, caretPos, String(editor.getProfileName()));
			
		if (tags && tags[0]) {
			// match found
			var openTag = tags[0];
			var closeTag = tags[1];
				
			if (closeTag) { // exclude unary tags
				if (openTag.start <= caretPos && openTag.end >= caretPos) {
					editor.setCaretPos(closeTag.start);
					return true;
				} else if (closeTag.start <= caretPos && closeTag.end >= caretPos){
					editor.setCaretPos(openTag.start);
					return true;
				}
			}
		}
		
		return false;
	});
})();