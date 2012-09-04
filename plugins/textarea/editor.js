/**
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * @constructor
 * @memberOf __emmetEditorTextarea
 * @param {Function} require
 * @param {Underscore} _
 */
emmet.define('editor', function(require, _) {
	/** @param {Element} Source element */
	var target = null;
		
	// different browser uses different newlines, so we have to figure out
	// native browser newline and sanitize incoming text with them
	var tx = document.createElement('textarea');
	tx.value = '\n';
	
	require('utils').setNewline(tx.value);
	tx = null;
	
	return {
		setContext: function(elem) {
			target = elem;
		},
		
		getContext: function() {
			return target;
		},
		
		getSelectionRange: function() {
			if ('selectionStart' in target) { // W3C's DOM
				return {
					start: target.selectionStart, 
					end: target.selectionEnd 
				};
			} else if (document.selection) { // IE
				target.focus();
		 
				var range = document.selection.createRange();
				
				if (range === null) {
					return {
						start: 0, 
						end: this.getContent().length
					};
				}
		 
				var re = target.createTextRange();
				var rc = re.duplicate();
				re.moveToBookmark(range.getBookmark());
				rc.setEndPoint('EndToStart', re);
		 
				return {
					start: rc.text.length, 
					end: rc.text.length + range.text.length
				};
			} else {
				return null;
			}
		},
		
		/**
		 * Creates text selection on target element
		 * @param {Number} start
		 * @param {Number} end
		 */
		createSelection: function(start, end) {
			// W3C's DOM
			if (typeof(end) == 'undefined')
				end = start;
				
			if ('setSelectionRange' in target) {
				target.setSelectionRange(start, end);
			} else if ('createTextRange' in target) {
				var t = target.createTextRange();
				
				t.collapse(true);
				var utils = require('utils');
				var delta = utils.splitByLines(this.getContent().substring(0, start)).length - 1;
				
				// IE has an issue with handling newlines while creating selection,
				// so we need to adjust start and end indexes
				end -= delta + utils.splitByLines(this.getContent().substring(start, end)).length - 1;
				start -= delta;
				
				t.moveStart('character', start);
				t.moveEnd('character', end - start);
				t.select();
			}
		},
		
		/**
		 * Returns current line's start and end indexes
		 */
		getCurrentLineRange: function() {
			var caretPos = this.getCaretPos();
			if (caretPos === null) return null;
			return require('utils').findNewlineBounds(this.getContent(), caretPos);
		},
		
		/**
		 * Returns current caret position
		 * @return {Number}
		 */
		getCaretPos: function() {
			var selection = this.getSelectionRange();
			return selection ? selection.start : null;
		},
		
		/**
		 * Set new caret position
		 * @param {Number} pos Caret position
		 */
		setCaretPos: function(pos) {
			this.createSelection(pos);
		},
		
		/**
		 * Returns content of current line
		 * @return {String}
		 */
		getCurrentLine: function() {
			var range = this.getCurrentLineRange();
			return range.start < range.end ? this.getContent().substring(range.start, range.end) : '';
		},
		
		/**
		 * Replace editor's content or it's part (from <code>start</code> to 
		 * <code>end</code> index). If <code>value</code> contains 
		 * <code>caret_placeholder</code>, the editor will put caret into 
		 * this position. If you skip <code>start</code> and <code>end</code>
		 * arguments, the whole target's content will be replaced with 
		 * <code>value</code>. 
		 * 
		 * If you pass <code>start</code> argument only,
		 * the <code>value</code> will be placed at <code>start</code> string 
		 * index of current content. 
		 * 
		 * If you pass <code>start</code> and <code>end</code> arguments,
		 * the corresponding substring of current target's content will be 
		 * replaced with <code>value</code>. 
		 * @param {String} value Content you want to paste
		 * @param {Number} start Start index of editor's content
		 * @param {Number} end End index of editor's content
		 * @param {Boolean} noIndent Do not auto indent <code>value</code>
		 */
		replaceContent: function(value, start, end, noIndent) {
			var content = this.getContent();
			var utils = require('utils');
			
			if (_.isUndefined(end)) 
				end = _.isUndefined(start) ? content.length : start;
			if (_.isUndefined(start)) start = 0;
			
			// indent new value
			if (!noIndent) {
				value = utils.padString(value, utils.getLinePaddingFromPosition(content, start));
			}
			
			// find new caret position
			var tabstopData = emmet.require('tabStops').extract(value, {
				escape: function(ch) {
					return ch;
				}
			});
			value = tabstopData.text;
			
			var firstTabStop = tabstopData.tabstops[0];
			if (firstTabStop) {
				firstTabStop.start += start;
				firstTabStop.end += start;
			} else {
				firstTabStop = {
					start: value.length + start,
					end: value.length + start
				};
			}
				
			try {
				target.value = utils.replaceSubstring(content, value, start, end);
				this.createSelection(firstTabStop.start, firstTabStop.end);
			} catch(e){}
		},
		
		/**
		 * Returns editor's content
		 * @return {String}
		 */
		getContent: function() {
			return target.value || '';
		},
		
		/**
		 * Returns current editor's syntax mode
		 * @return {String}
		 */
		getSyntax: function(){
			var syntax = require('textarea').getOption('syntax');
			var caretPos = this.getCaretPos();
				
			if (!require('resources').hasSyntax(syntax))
				syntax = 'html';
				
			if (syntax == 'html') {
				// get the context tag
				var pair = require('html_matcher').getTags(this.getContent(), caretPos);
				if (pair && pair[0] && pair[0].type == 'tag' && pair[0].name.toLowerCase() == 'style') {
					// check that we're actually inside the tag
					if (pair[0].end <= caretPos && pair[1].start >= caretPos)
						syntax = 'css';
				}
			}
			return syntax;
		},
		
		/**
		 * Returns current output profile name (@see emmet#setupProfile)
		 * @return {String}
		 */
		getProfileName: function() {
			return require('textarea').getOption('profile');
		},
		
		/**
		 * Ask user to enter something
		 * @param {String} title Dialog title
		 * @return {String} Entered data
		 * @since 0.65
		 */
		prompt: function(title) {
			return prompt(title);
		},
		
		/**
		 * Returns current selection
		 * @return {String}
		 * @since 0.65
		 */
		getSelection: function() {
			var sel = this.getSelectionRange();
			if (sel) {
				try {
					return this.getContent().substring(sel.start, sel.end);
				} catch(e) {}
			}
			
			return '';
		},
		
		/**
		 * Returns current editor's file path
		 * @return {String}
		 * @since 0.65 
		 */
		getFilePath: function() {
			return location.href;
		}
	};
});
 