/**
 * HTML pair matching (balancing) actions
 * @constructor
 * @memberOf __matchPairActionDefine
 * @param {Function} require
 * @param {Underscore} _
 */
emmet.exec(function(require, _) {
	/** @type emmet.actions */
	var actions = require('actions');
	var matcher = require('html_matcher');
	
	/**
	 * Find and select HTML tag pair
	 * @param {IEmmetEditor} editor Editor instance
	 * @param {String} direction Direction of pair matching: 'in' or 'out'. 
	 * Default is 'out'
	 */
	function matchPair(editor, direction, syntax) {
		direction = String((direction || 'out').toLowerCase());
		var info = require('editorUtils').outputInfo(editor, syntax);
		syntax = info.syntax;
		
		var range = require('range');
		/** @type Range */
		var selRange = range.create(editor.getSelectionRange());
		var content = info.content;
		/** @type Range */
		var tagRange = null;
		/** @type Range */
		var _r;
		
		var oldOpenTag = matcher.last_match['opening_tag'];
		var oldCloseTag = matcher.last_match['closing_tag'];
			
		if (direction == 'in' && oldOpenTag && selRange.length()) {
//			user has previously selected tag and wants to move inward
			if (!oldCloseTag) {
//				unary tag was selected, can't move inward
				return false;
			} else if (oldOpenTag.start == selRange.start) {
				if (content.charAt(oldOpenTag.end) == '<') {
//					test if the first inward tag matches the entire parent tag's content
					_r = range.create(matcher.find(content, oldOpenTag.end + 1, syntax));
					if (_r.start == oldOpenTag.end && _r.end == oldCloseTag.start) {
						tagRange = range.create(matcher(content, oldOpenTag.end + 1, syntax));
					} else {
						tagRange = range.create(oldOpenTag.end, oldCloseTag.start - oldOpenTag.end);
					}
				} else {
					tagRange = range.create(oldOpenTag.end, oldCloseTag.start - oldOpenTag.end);
				}
			} else {
				var newCursor = content.substring(0, oldCloseTag.start).indexOf('<', oldOpenTag.end);
				var searchPos = newCursor != -1 ? newCursor + 1 : oldOpenTag.end;
				tagRange = range.create(matcher(content, searchPos, syntax));
			}
		} else {
			tagRange = range.create(matcher(content, selRange.end, syntax));
		}
		
		if (tagRange && tagRange.start != -1) {
			editor.createSelection(tagRange.start, tagRange.end);
			return true;
		}
		
		return false;
	}
	
	actions.add('match_pair', matchPair, {hidden: true});
	actions.add('match_pair_inward', function(editor){
		return matchPair(editor, 'in');
	}, {label: 'HTML/Match Pair Tag (inward)'});

	actions.add('match_pair_outward', function(editor){
		return matchPair(editor, 'out');
	}, {label: 'HTML/Match Pair Tag (outward)'});
	
	/**
	 * Moves caret to matching opening or closing tag
	 * @param {IEmmetEditor} editor
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
	}, {label: 'HTML/Go To Matching Tag Pair'});
});