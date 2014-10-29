/**
 * Editor stub for unit testing. Implements {@link IEmmetEditor} interface.
 */
var path = require('path');
var utils = require('../../lib/utils/common');
var tabStops = require('../../lib/assets/tabStops');

var caret = 0;
var content = '';
var selection = {
	start: 0, 
	end: 0
};
var syntax = 'html';
var profile = null;
var promptValue = '';
var filePath = path.join(__dirname, 'index.html');

function isdef(val) {
	return typeof val !== 'undefined';
}

module.exports = {
	/** @memberOf editorStub */
	getSelectionRange: function() {
		return selection;
	},
	
	createSelection: function(start, end) {
		if (!isdef(end))
			end = start;
		
		selection.start = caret = start;
		selection.end = end;
	},
	
	/**
	 * Returns current line's start and end indexes
	 */
	getCurrentLineRange: function() {
		return utils.findNewlineBounds(content, caret);
	},
	
	/**
	 * Returns current caret position
	 * @return {Number}
	 */
	getCaretPos: function() {
		return caret;
	},
	
	/**
	 * Set new caret position
	 * @param {Number} pos Caret position
	 */
	setCaretPos: function(pos) {
		this.createSelection(Math.min(content.length, Math.max(0, pos)));
	},
	
	/**
	 * Returns content of current line
	 * @return {String}
	 */
	getCurrentLine: function() {
		var range = this.getCurrentLineRange();
		return range.start < range.end ? content.substring(range.start, range.end) : '';
	},
	
	/**
	 * Replace editor's content or it's part (from <code>start</code> to 
	 * <code>end</code> index). If <code>value</code> contains 
	 * <code>caret_placeholder</code>, the editor will put caret into 
	 * this position. 
	 * 
	 * If you skip <code>start</code> and <code>end</code>
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
		if (!isdef(end)) 
			end = !isdef(start) ? content.length : start;
		if (!isdef(start)) start = 0;
		
		// indent new value
		if (!noIndent) {
			value = utils.padString(value, utils.getLinePaddingFromPosition(content, start));
		}
		
		// find new caret position
		var tabstopData = tabStops.extract(value, {
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
			
		content = utils.replaceSubstring(content, value, start, end);
		this.createSelection(firstTabStop.start, firstTabStop.end);
	},
	
	/**
	 * Returns editor's content
	 * @return {String}
	 */
	getContent: function() {
		return content;
	},
	
	setContent: function(value) {
		content = value;
		this.setCaretPos(content.length);
	},
	
	/**
	 * Returns current editor's syntax mode
	 * @return {String}
	 */
	getSyntax: function(){
		return syntax;
	},
	
	setSyntax: function(name){
		syntax = name;
	},
	
	/**
	 * Returns current output profile name (@see emmet#setupProfile)
	 * @return {String}
	 */
	getProfileName: function() {
		return profile;
	},
	
	setProfileName: function(name) {
		profile = name;
	},
	
	/**
	 * Ask user to enter something
	 * @param {String} title Dialog title
	 * @return {String} Entered data
	 * @since 0.65
	 */
	prompt: function(title) {
		return promptValue;
	},
	
	setPromptOutput: function(value) {
		promptValue = value;
	},
	
	/**
	 * Returns current selection
	 * @return {String}
	 * @since 0.65
	 */
	getSelection: function() {
		return content.substring(selection.start, selection.end);
	},
	
	/**
	 * Returns current editor's file path
	 * @return {String}
	 * @since 0.65 
	 */
	getFilePath: function() {
		return filePath;
	},

	setFilePath: function(value) {
		return filePath = value;
	}
};