// Utility functions
// distance - Like cursor, only absolute
// interval - Like range, only absolute
distanceFromCursor = function(cursor) {
	var pos = cursor.column;
	var a;
	for (a = 0; a < cursor.line; a++) {
		pos += document.lineLength(a) + 1; //Kate normalizes newlines to \n
	}
	return pos;
}

intervalFromRange = function(range) {
	return {
		start: distanceFromCursor(range.start),
		end: distanceFromCursor(range.end)
	}
}

cursorFromDistance = function(distance) {
	var line = 0;
	var positionSoFar = 0;
	while (positionSoFar + (document.lineLength(line) + 1) <= distance) {
		positionSoFar += (document.lineLength(line) + 1)
		line++;
	}
	return new Cursor(line, distance - positionSoFar);
	
}

rangeFromIntervals = function(distance1, distance2) {
	return new Range( cursorFromDistance(distance1), cursorFromDistance(distance2) );
}

// Pseudo editor interface
var zen_editor = function(document, view) {
	this.context = document;
	
	this.setContext = function(document) {
		this.context = document;
	}
	
	
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
	this.getSelectionRange = function() {
		var returnValue
		if (view.hasSelection()) {
			returnValue = intervalFromRange(view.selection());
		}
		else {
			returnValue = intervalFromRange(new Range(view.cursorPosition(), view.cursorPosition()));
		}
		return returnValue;
	}
	
	/**
	 * Creates selection from <code>start</code> to <code>end</code> character
	 * indexes. If <code>end</code> is ommited, this method should place caret 
	 * and <code>start</code> index
	 * @param {Number} start
	 * @param {Number} [end]
	 * @example
	 * editor.createSelection(10, 40);
	 * 
	 * //move caret to 15th character
	 * editor.createSelection(15);
	 */
	this.createSelection = function(start, end) {
		var selection = rangeFromIntervals(start, end);
		view.setSelection(selection);
	}
	
	/**
	 * Returns current line's start and end indexes as object with <code>start</code>
	 * and <code>end</code> properties
	 * @return {Object}
	 * @example
	 * var range = editor.getCurrentLineRange();
	 * alert(range.start + ', ' + range.end);
	 */
	this.getCurrentLineRange = function() {
		var position = view.cursorPosition()
		return {
			start: distanceFromCursor(new Cursor(position.line, 0)),
			end: distanceFromCursor(new Cursor(position.line,document.lineLength(position.line)))
		};
	}
	
	/**
	 * Returns current caret position
	 * @return {Number|null}
	 */
	this.getCaretPos = function(){
		return distanceFromCursor(view.cursorPosition());
	}
	
	/**
	 * Set new caret position
	 * @param {Number} pos Caret position
	 */
	this.setCaretPos = function(pos){
		view.setCursorPosition(cursorFromDistance(pos));
	}
	
	/**
	 * Returns content of current line
	 * @return {String}
	 */
	this.getCurrentLine = function() {
		return document.line(view.cursorPosition().line);
	}
	
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
	 * @param {Number} [start] Start index of editor's content
	 * @param {Number} [end] End index of editor's content
	 * @param {Boolean} [no_indent] Do not auto indent <code>value</code>
	 */
	this.replaceContent = function(value, start, end, no_indent) {
		//handle the no indent parameter
		if (!no_indent) {
			var utils = emmet.require('utils');
			value = utils.padString(value, utils.getLinePadding(this.getCurrentLine()));
		}
		
		//emmet's tabstops - TODO: what would be the best way to support this in Kate?
		var tabstopData = emmet.require('tabStops').extract(value, {
				escape: function(ch) {
					return ch;
				}
			});
		value = tabstopData.text;
		var firstTabStop = tabstopData.tabstops[0];
		
		if (typeof(end) == 'undefined') {
			if (typeof(start) == 'undefined') {
				document.setText(value);
			} else {
				document.insertText(cursorFromDistance(start), value);
			}
		} else {
			document.editBegin(); //group changes together in undo history
			var docRange = rangeFromIntervals(start, end);
			document.removeText(docRange);
			document.insertText(docRange.start, value);
			document.editEnd();
		}
		if (firstTabStop) this.setCaretPos(start + firstTabStop.start);
	}
	
	/**
	 * Returns editor's content
	 * @return {String}
	 */
	this.getContent = function(){
		return document.text();
	}
	
	/**
	 * Returns current editor's syntax mode
	 * @return {String}
	 */
	this.getSyntax = function(){
		var syntax = document.highlightingModeAt(view.cursorPosition()).toLowerCase();
		if (syntax == 'haml with ruby') syntax = 'haml'; //fixes a common syntax highlighting verbosity
		return syntax;
	}
	
	/**
	 * Returns current output profile name (@see emmet#setupProfile)
	 * @return {String}
	 */
	this.getProfileName = function() {
		var profile = this.getSyntax();
		if (profile == 'html') {
			var htmlProfile = emmet.require('resources').getVariable('profile');
			if (!htmlProfile) {
				htmlProfile = this.getContent().search(/<!DOCTYPE[^>]+XHTML/i) != -1 ? 'xhtml': 'html';
			}
			profile = htmlProfile;
		}
		return profile;
	}
	
	/**
	 * Ask user to enter something
	 * @param {String} title Dialog title
	 * @return {String} Entered data
	 * @since 0.65
	 */
	this.prompt = function(title) {
		return '';
	}
	
	/**
	 * Returns current selection
	 * @return {String}
	 * @since 0.65
	 */
	this.getSelection = function() {
		return view.selectedText();
	}
	
	/**
	 * Returns current editor's file path
	 * @return {String}
	 * @since 0.65 
	 */
	this.getFilePath = function() {
		return document.url(); //or would document.fileName() be better?
	}
	
}