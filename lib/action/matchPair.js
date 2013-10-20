/**
 * HTML pair matching (balancing) actions
 * @constructor
 */
if (typeof module === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		module.exports = factory(require, exports, module);
	};
}

define(function(require, exports, module) {
	var htmlMatcher = require('../assets/htmlMatcher');
	var utils = require('../utils/common');
	var editorUtils = require('../utils/editor');
	var range = require('../assets/range');
	var lastMatch = null;
	
	return {
		/**
		 * Find and select HTML tag pair
		 * @param {IEmmetEditor} editor Editor instance
		 * @param {String} direction Direction of pair matching: 'in' or 'out'. 
		 * Default is 'out'
		 */
		balance: function(editor, direction) {
			direction = String((direction || 'out').toLowerCase());
			var info = editorUtils.outputInfo(editor);
			
			var sel = range(editor.getSelectionRange());
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
							var narrowed = utils.narrowToNonSpace(content, lastMatch.innerRange);
							lastMatch = htmlMatcher.find(content, narrowed.start + 1);
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
						lastMatch = htmlMatcher.find(content, sel.start);
						if (lastMatch && lastMatch.range.equal(sel) && lastMatch.innerRange.equal(sel)) {
							lastMatch.range = lastMatch.outerRange;
						}
					}
				}
			} else {
				lastMatch = htmlMatcher.find(content, sel.start);
			}
			
			if (lastMatch && !lastMatch.range.equal(sel)) {
				editor.createSelection(lastMatch.range.start, lastMatch.range.end);
				return true;
			}
			
			lastMatch = null;
			return false;
		},

		balanceInwardAction: function(editor) {
			return this.balance(editor, 'in');
		},

		balanceOutwardAction: function(editor) {
			return this.balance(editor, 'out');	
		},

		/**
		 * Moves caret to matching opening or closing tag
		 * @param {IEmmetEditor} editor
		 */
		goToMatchingPairAction: function(editor) {
			var content = String(editor.getContent());
			var caretPos = editor.getCaretPos();
			
			if (content.charAt(caretPos) == '<') 
				// looks like caret is outside of tag pair  
				caretPos++;
				
			var tag = htmlMatcher.tag(content, caretPos);
			if (tag && tag.close) { // exclude unary tags
				if (tag.open.range.inside(caretPos)) {
					editor.setCaretPos(tag.close.range.start);
				} else {
					editor.setCaretPos(tag.open.range.start);
				}
				
				return true;
			}
			
			return false;
		}
	};
});