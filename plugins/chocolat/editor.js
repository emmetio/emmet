var _ = require('underscore');
var emmet = require('./emmet');

/**
 * Chocolat editor proxy for Emmet toolkit 
 */
module.exports = {
	/** @type Recipe Current session’s text recipe */	
	recipe: null,
	
	/**
	 * Returns character indexes of selected text: object with <code>start</code>
	 * and <code>end</code> properties. If there's no selection, should return 
	 * object with <code>start</code> and <code>end</code> properties referring
	 * to current caret position
	 * @return {Object}
	 * @example
	 * var selection = editor.getSelectionRange();
	 * alert(selection.start + ', ' + selection.end); 
	 */
	getSelectionRange: function() {
		var sel = this.recipe.selection;
		return {
			start: sel.location,
			end: sel.location + sel.length
		};
	},
	
	/**
	 * Creates selection from <code>start</code> to <code>end</code> character
	 * indexes. If <code>end</code> is omitted, this method should place caret 
	 * and <code>start</code> index
	 * @param {Number} start
	 * @param {Number} end
	 * @example
	 * editor.createSelection(10, 40);
	 * 
	 * //move caret to 15th character
	 * editor.createSelection(15);
	 */
	createSelection: function(start, end) {
		if (typeof end == 'undefined')
			end = start;
		
		this.recipe.selection = new Range(start, end - start);
	},
	
	_lineRange: function() {
		return this.recipe.contentRangeOfLinesInRange(this.recipe.selection);
	},
	
	/**
	 * Returns current line's start and end indexes as object with <code>start</code>
	 * and <code>end</code> properties
	 * @return {Object}
	 * @example
	 * var range = editor.getCurrentLineRange();
	 * alert(range.start + ', ' + range.end);
	 */
	getCurrentLineRange: function() {
		var r = this._lineRange();
		return {
			start: r.location, 
			end: r.location + r.length
		};
	},
	
	/**
	 * Returns current caret position
	 * @return {Number}
	 */
	getCaretPos: function() {
		return this.getSelectionRange().start;
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
		return this.recipe.textInRange(this._lineRange());
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
		var utils = emmet.require('utils');
		
		if (_.isUndefined(end)) 
			end = _.isUndefined(start) ? content.length : start;
		if (_.isUndefined(start)) start = 0;
		
		// currently, Chocolat doesn’t support insertion of snippets inside
		// recipes so I have to remove tabstops before output will be inserted
		
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
		
		
		var range = new Range(start, end - start);
		this.recipe.replaceTextInRange(range, value);
		this.createSelection(firstTabStop.start, firstTabStop.end);
	},
	
	/**
	 * Returns editor's content
	 * @return {String}
	 */
	getContent: function() {
		return this.recipe.text;
	},
	
	/**
	 * Returns current editor's syntax mode
	 * @return {String}
	 */
	getSyntax: function() {
		// TODO use Document.current().contextAtLocation(idx) to get list of
		// current scopes
		var scope = Document.current().rootScope() || '';
		var parts = scope.split('.');
		var res = emmet.require('resources');
		var syntax = 'html';
		for (var i = 0, il = parts.length; i < il; i++) {
			if (res.hasSyntax(parts[i])) {
				syntax = parts[i];
				break;
			}
		}
		
		if (syntax == 'html') {
			// get the context tag
			var caretPos = this.getCaretPos();
			var pair = emmet.require('html_matcher').getTags(this.getContent(), caretPos);
			if (pair && pair[0] && pair[0].type == 'tag' && pair[0].name.toLowerCase() == 'style') {
				// check that we're actually inside the tag
				if (pair[0].end <= caretPos && pair[1].start >= caretPos)
					syntax = 'css';
			}
		}
		
		return syntax;
	},
	
	/**
	 * Returns current output profile name
	 * @return {String}
	 */
	getProfileName: function() {
		return require('actionUtils').detectProfile(this);
	},
	
	/**
	 * Ask user to enter something
	 * @param {String} title Dialog title
	 * @return {String} Entered data
	 * @since 0.65
	 */
	prompt: function(title) {
		return '';
	},
	
	/**
	 * Returns current selection
	 * @return {String}
	 * @since 0.65
	 */
	getSelection: function() {
		return this.recipe.textInRange(this.recipe.selection);
	},
	
	/**
	 * Returns current editor's file path
	 * @return {String}
	 * @since 0.65 
	 */
	getFilePath: function() {
		return Document.current().path();
	}
};