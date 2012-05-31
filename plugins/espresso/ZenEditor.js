/**
* High-level editor interface that communicates with underlying editor (like
* TinyMCE, CKEditor, etc.) or browser.
* Basically, you should call <code>zen_editor.setContext(obj)</code> method to
* set up undelying editor context before using any other method.
*
* This interface is used by <i>zen_actions.js</i> for performing different
* actions like <b>Expand abbreviation</b>
*
* @example
* var textarea = document.getElemenetsByTagName('textarea')[0];
* zen_editor.setContext(textarea);
* //now you are ready to use editor object
* zen_editor.getSelectionRange();
*
* @author Sergey Chikuyonok (serge.che@gmail.com)
* @link http://chikuyonok.ru
*/

var ZenEditor = function(context) {
	this.placeholder_index = 1;
	this._context = context;
	zen_coding.setNewline(this._context.textPreferences.lineEndingString);
	var self = this;
	zen_coding.setCaretPlaceholder(function() {
		return self.getNextPlaceholder.apply(self);
	});
};

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
ZenEditor.prototype.getSelectionRange = function() {
	// Fetch the range from the context
	var range = this._context.selectedRanges[0];
	// Convert into start and end points
	return {
		start: range.location,
		end: range.location + range.length
	};
};

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
ZenEditor.prototype.createSelection = function(start, end) {
	if (typeof end === 'undefined' || end === null) {
		var end = start;
	}
	var newRange = new Range(start, end - start);
	this._context.selectedRanges = [newRange];
};

/**
* Returns current line's start and end indexes as object with <code>start</code>
* and <code>end</code> properties
* @return {Object}
* @example
* var range = zen_editor.getCurrentLineRange();
* alert(range.start + ', ' + range.end);
*/
ZenEditor.prototype.getCurrentLineRange = function() {
	var range = this.getSelectionRange();
	var line = this._context.lineStorage.lineRangeForIndex(range.start);
	return {
		start: line.location,
		end: line.location + line.length
	};
};

/**
* Returns current caret position
* @return {Number|null}
*/
ZenEditor.prototype.getCaretPos = function() {
	return this.getSelectionRange().start;
};
	
/**
* Set new caret position
* @param {Number} pos Caret position
*/
ZenEditor.prototype.setCaretPos = function(pos) {
	this.createSelection(pos);
};

/**
* Returns content of current line
* @return {String}
*/
ZenEditor.prototype.getCurrentLine = function() {
	var range = this.getCurrentLineRange();
	return this.getRangeText(range.start, range.end);
};

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
*/
ZenEditor.prototype.replaceContent = function(value, start, end) {
	if ((typeof start === 'undefined' || start === null) && (typeof end === 'undefined' || end === null)) {
		var start = 0;
		var end = this._context.string.length;
	} else if (typeof end === 'undefined' || end === null) {
		var end = start;
	}
	var range = new Range(start, end - start);
	this._context.selectedRanges = [range];
	this._context.insertTextSnippet(new CETextSnippet(value));
};

/**
* Returns editor's content
* @return {String}
*/
ZenEditor.prototype.getContent = function() {
	return this._context.string;
};

/**
* Returns current editor's syntax mode
* @return {String}
*/
ZenEditor.prototype.getSyntax = function() {
	var zones = {
		"css, css *" : "css",
		"xsl, xsl *": "xsl",
		"xml, xml *": "xml",
		"haml, haml *": "haml"
	};
	var range = this.getSelectionRange();
	range = new Range(range.start, range.end - range.start);
	// Iterate over zones and check syntax context
	var syntax = 'html';
	var selectors, zone;
	for (var selector in zones) {
		selectors = new SXSelector(selector);
		
		if (this._context.string.length == range.location) {
			// Very beginning of the document
			zone = this._context.syntaxTree.rootZone;
		} else {
			zone = this._context.syntaxTree.zoneAtCharacterIndex(range.location);
		}
		if (selectors.matches(zone)) {
			syntax = zones[selector];
			break;
		}
	}
	
	return syntax;
};

/**
* Returns current output profile name (@see zen_coding#setupProfile)
* @return {String}
*/
ZenEditor.prototype.getProfileName = function() {
	var forcedProfile = zen_coding.getVariable('profile');
	if (forcedProfile) {
		return forcedProfile;
	}
	return 'xhtml';
};

/**
* Ask user to enter something
* @param {String} title Dialog title
* @return {String} Entered data
* @since 0.65
*/
ZenEditor.prototype.prompt = function(title) {
	// TODO: not currently possible with existing Espresso JavaScript API
	return '';
};

/**
* Returns current selection
* @return {String}
* @since 0.65
*/
ZenEditor.prototype.getSelection = function() {
	var range = this.getSelectionRange();
	return this.getRangeText(range.start, range.end);
};

/**
* Returns current editor's file path
* @return {String}
* @since 0.65
*/
ZenEditor.prototype.getFilePath = function() {
	return this._context.documentContext.fileURL;
};

ZenEditor.prototype.getNextPlaceholder = function() {
	var placeholder = '${' + this.placeholder_index + '}';
	this.placeholder_index++;
	return placeholder;
};
	
// CUSTOM
ZenEditor.prototype.getRangeText = function(start, end) {
	if (start < end && start < this._context.string.length && end <= this._context.string.length) {
		var range = new Range(start, end - start);
		return this._context.substringWithRange(range);
	} else {
		return null;
	}
};

// Setup our exports object
library.ZenEditor = ZenEditor;
library.engine = zen_coding;