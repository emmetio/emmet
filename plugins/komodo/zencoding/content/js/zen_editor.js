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
var zen_editor = {
	context: null,
	scimoz: null,
	
	_bytesToChar: function(bytes) {
		return this.scimoz.getTextRange(0, bytes).length;
	},
	
	_charsToByte: function(chars) {
		var old_pos = this.scimoz.currentPos,
			_c = chars,
			bytes = null;
			
		if (_c) {
			// find correct pos
			do {
				this.scimoz.gotoPos(_c);
				if (this._bytesToChar(this.scimoz.currentPos))
					break;
			} while(_c--);
		}
			
		this.scimoz.gotoPos(_c);
		while (chars > this._bytesToChar(this.scimoz.currentPos)) {
			this.scimoz.charRight();
		}
		
		bytes = this.scimoz.currentPos;
		
		// revert position
		this.scimoz.gotoPos(old_pos);
		
		return bytes;
	},
	
	/**
	 * Setup underlying editor context. You should call this method 
	 * <code>before</code> using any Zen Coding action.
	 * @param {Object} context
	 */
	setContext: function(context) {
		this.context = context;
		this.scimoz = context.scintilla.scimoz;
		
		var indentation = zen_coding.getVariable('indentation');
		if (this.scimoz.useTabs) {
			indentation = '\t';
		} else {
			indentation = zen_coding.repeatString(' ', this.scimoz.indent);
		}
		zen_coding.setVariable('indentation', indentation);
		
		switch (this.scimoz.eOLMode) {
			case 0: // windows
				zen_coding.setNewline('\r\n');
				break;
			case 1: // mac os classic 
				zen_coding.setNewline('\r');
				break;
			default: // unix 
				zen_coding.setNewline('\n');
		}
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
			start: this._bytesToChar(this.scimoz.selectionStart),
			end: this._bytesToChar(this.scimoz.selectionEnd)
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
		start = this._charsToByte(start);
		end = this._charsToByte(end);
		this.scimoz.setSel(start, end);
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
		var line = this.scimoz.lineFromPosition(this.getCaretPos());
		var result = {
			start: this._bytesToChar(this.scimoz.positionFromLine(line)), 
			end: this._bytesToChar(this.scimoz.getLineEndPosition(line))
		};
		
		return result;
	},
	
	/**
	 * Returns current caret position
	 * @return {Number|null}
	 */
	getCaretPos: function(){
		return this._bytesToChar(this.scimoz.currentPos);
	},
	
	/**
	 * Set new caret position
	 * @param {Number} pos Caret position
	 */
	setCaretPos: function(pos){
		pos = this._charsToByte(pos);
		this.scimoz.currentPos = pos;
		this.scimoz.anchor = pos;
	},
	
	/**
	 * Returns content of current line
	 * @return {String}
	 */
	getCurrentLine: function() {
		var range = this.getCurrentLineRange();
		return this.getContent().substring(range.start, range.end);
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
	 * @param {Number} [start] Start index of editor's content
	 * @param {Number} [end] End index of editor's content
	 * @param {Boolean} [no_indent] Do not auto indent <code>value</code>
	 */
	replaceContent: function(value, start, end, no_indent) {
		var content = this.getContent(),
			caret_pos = this.getCaretPos(),
			caret_placeholder = zen_coding.getCaretPlaceholder(),
			has_start = typeof(start) !== 'undefined',
			has_end = typeof(end) !== 'undefined';
			
		// indent new value
		if (!no_indent) {
			var line_padding = (this.getCurrentLine().match(/^(\s+)/) || [''])[0];
			value = zen_coding.padString(value, line_padding);
		}
		
		// find new caret position
		var new_pos = value.indexOf(caret_placeholder);
		if (new_pos != -1) {
			caret_pos = (start || 0) + new_pos;
			value = value.split(caret_placeholder).join('');
		} else {
			caret_pos = value.length + (start || 0);
		}
		
		if (!has_start && !has_end) {
			start = 0;
			end = content.length;
		} else if (!has_end) {
			end = start;
		}
		
		this.context.setFocus();
		this.scimoz.beginUndoAction();
		this.scimoz.targetStart = this._charsToByte(start);
		this.scimoz.targetEnd = this._charsToByte(end);
		this.scimoz.replaceTarget(value.length, value);
		this.setCaretPos(caret_pos);
		this.scimoz.endUndoAction();
	},
	
	/**
	 * Returns editor's content
	 * @return {String}
	 */
	getContent: function(){
		return this.scimoz.text;
	},
	
	/**
	 * Returns current editor's syntax mode
	 * @return {String}
	 */
	getSyntax: function(){
		var know_syntaxes = {
			'html': 1,
			'css': 1,
			'xml': 1,
			'xml': 1,
			'haml': 1
		};
		var syntax = this.context.document.language.toLowerCase(),
			caret_pos = this.getCaretPos();
		
		if (!(syntax in know_syntaxes)) {
			syntax = 'html';
		}
		
		if (syntax == 'html') {
			// get the context tag
			var pair = zen_coding.html_matcher.getTags(this.getContent(), caret_pos);
			if (pair && pair[0] && pair[0].type == 'tag' && pair[0].name.toLowerCase() == 'style') {
				// check that we're actually inside the tag
				if (pair[0].end <= caret_pos && pair[1].start >= caret_pos)
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
		return 'xhtml';
	},
	
	/**
	 * Ask user to enter something
	 * @param {String} title Dialog title
	 * @return {String} Entered data
	 * @since 0.65
	 */
	prompt: function(title) {
		return ko.dialogs.prompt(title);
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
		return ko.views.manager.currentView.document.file.URI;
	},
	
	/**
	 * Returns core Zen Codind object
	 */
	getCore: function() {
		return zen_coding;
	},
	
	/**
	 * Returns Zen Coding resource manager. You can add new snippets and 
	 * abbreviations with this manager, as well as modify ones.<br><br>
	 * 
	 * Zen Coding stores settings in two separate vocabularies: 'system' 
	 * and 'user'. The ultimate solution to add new abbreviations and
	 * snippets is to setup a 'user' vocabulary, like this:
	 * 
	 * @example
	 * var my_settings = {
	 * 	html: {
	 * 		abbreviations: {
	 * 			'tag': '<div class="mytag">'
	 * 		}
	 * 	}
	 * };
	 * zen_editor.getResourceManager().setVocabulary(my_settings, 'user')
	 * 
	 * @see zen_resources.js
	 */
	getResourceManager: function() {
		return zen_resources;
	}
};