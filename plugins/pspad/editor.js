/**
 * @param {Function} require
 * @param {Underscore} _
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */
var editorProxy = zen_coding.exec(function(require, _){
	var context = null;
	
	return {
		/**
		 * Setup underlying editor context. You should call this method 
		 * <code>before</code> using any Zen Coding action.
		 * @param {Object} context
		 */
		setContext: function(ctx) {
			context = ctx;
		},
		
		/**
		 * Returns character indexes of selected text: object with <code>start</code>
		 * and <code>end</code> properties. If there's no selection, should return 
		 * object with <code>start</code> and <code>end</code> properties referring
		 * to current caret position
		 * @return {Object}
		 * @example
		 * var selection = zen_editor.getSelectionRange();
		 * alert(selection.start + ', ' + selection.end); 
		 */
		getSelectionRange: function() {
			return {
				start: context.selStart(),
				end: context.selStart() + context.selLength()
			};
		},
		
		/**
		 * Creates selection from <code>start</code> to <code>end</code> character
		 * indexes. If <code>end</code> is ommited, this method should place caret 
		 * and <code>start</code> index
		 * @param {Number} start
		 * @param {Number} [end]
		 * @example
		 * zen_editor.createSelection(10, 40);
		 * 
		 * //move caret to 15th character
		 * zen_editor.createSelection(15);
		 */
		createSelection: function(start, end) {
			context.selStart(start);
			context.selLength(end - start);
		},
		
		/**
		 * Returns current line's start and end indexes as object with <code>start</code>
		 * and <code>end</code> properties
		 * @return {Object}
		 * @example
		 * var range = zen_editor.getCurrentLineRange();
		 * alert(range.start + ', ' + range.end);
		 */
		getCurrentLineRange: function() {
			return require('utils').findNewlineBounds(this.getContent(), this.getCaretPos());
		},
		
		/**
		 * Returns current caret position
		 * @return {Number}
		 */
		getCaretPos: function(){
			return context.selStart();
		},
		
		/**
		 * Set new caret position
		 * @param {Number} pos Caret position
		 */
		setCaretPos: function(pos) {
			this.createSelection(pos, pos);
		},
		
		/**
		 * Returns content of current line
		 * @return {String}
		 */
		getCurrentLine: function() {
			return context.lineText();
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
			var tabstopData = require('tabStops').extract(value, {
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
			
			// adjust caret position by line count
			var lines = utils.splitByLines(value.substring(0, firstTabStop.start));
			firstTabStop.start += lines.length - 1;
			firstTabStop.end += lines.length - 1;
			
			this.createSelection(start, end);
			context.selText(value);
			this.createSelection(firstTabStop.start, firstTabStop.end);
		},
		
		/**
		 * Returns editor's content
		 * @return {String}
		 */
		getContent: function(){
			return context.text() || '';
		},
		
		/**
		 * Returns current editor's syntax mode
		 * @return {String}
		 */
		getSyntax: function() {
			var syntax = 'html';
			var caretPos = this.getCaretPos();
			var m = /\.(\w+)$/.exec(this.getFilePath());
				
			// guess syntax by file name
			if (m) {
				syntax = m[1].toLowerCase();
				if (!require('resources').hasSyntax(syntax))
					syntax = 'html';
			}
			
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
		 * Returns current output profile name (@see zen_coding#setupProfile)
		 * @return {String}
		 */
		getProfileName: function() {
			return require('resources').getVariable('profile') || 'xhtml';
		},
		
		/**
		 * Ask user to enter something
		 * @param {String} title Dialog title
		 * @return {String} Entered data
		 * @since 0.65
		 */
		prompt: function(title) {
			return inputText(title);
		},
		
		/**
		 * Returns current selection
		 * @return {String}
		 * @since 0.65
		 */
		getSelection: function() {
			var sel = getSelectionRange();
			if (sel) {
				try {
					return getContent().substring(sel.start, sel.end);
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
			return context.fileName() || '';
		}
	};
})();
