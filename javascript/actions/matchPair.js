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
	var matcher = require('htmlMatcher');
	var lastMatch = null;
	
	/**
	 * Find and select HTML tag pair
	 * @param {IEmmetEditor} editor Editor instance
	 * @param {String} direction Direction of pair matching: 'in' or 'out'. 
	 * Default is 'out'
	 */
	function matchPair(editor, direction) {
		direction = String((direction || 'out').toLowerCase());
		var info = require('editorUtils').outputInfo(editor);
		
		var range = require('range');
		/** @type Range */
		var sel = range.create(editor.getSelectionRange());
		var content = info.content;
		
		// validate previous match
		if (lastMatch && !lastMatch.range.equal(sel)) {
			lastMatch = null;
		}
		
		if (lastMatch && sel.length()) {
			if (direction == 'in') {
				// user has previously selected tag and wants to move inward
				if (lastMatch.type == 'tag' && !lastMatch.close) {
					// unary tag was selected, can't move inward
					return false;
				} else {
					if (lastMatch.range.equal(lastMatch.outerRange)) {
						lastMatch.range = lastMatch.innerRange;
					} else {
						var narrowed = require('utils').narrowToNonSpace(content, lastMatch.innerRange);
						lastMatch = matcher.find(content, narrowed.start + 1);
						if (lastMatch && lastMatch.range.equal(sel) && lastMatch.outerRange.equal(sel)) {
							lastMatch.range = lastMatch.innerRange;
						}
					}
				}
			} else {
				if (
						!lastMatch.innerRange.equal(lastMatch.outerRange) 
						&& lastMatch.range.equal(lastMatch.innerRange) 
						&& sel.equal(lastMatch.range)) {
					lastMatch.range = lastMatch.outerRange;
				} else {
					lastMatch = matcher.find(content, sel.start);
					if (lastMatch && lastMatch.range.equal(sel) && lastMatch.innerRange.equal(sel)) {
						lastMatch.range = lastMatch.outerRange;
					}
				}
			}
		} else {
			lastMatch = matcher.find(content, sel.start);
		}
		
		if (lastMatch && !lastMatch.range.equal(sel)) {
			editor.createSelection(lastMatch.range.start, lastMatch.range.end);
			return true;
		}
		
		lastMatch = null;
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
			
		var tag = matcher.tag(content, caretPos);
		if (tag && tag.close) { // exclude unary tags
			if (tag.open.range.inside(caretPos)) {
				editor.setCaretPos(tag.close.range.start);
			} else {
				editor.setCaretPos(tag.open.range.start);
			}
			
			return true;
		}
		
		return false;
	}, {label: 'HTML/Go To Matching Tag Pair'});
});