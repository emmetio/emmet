/**
 * @param {Function} require
 * @param {Underscore} _
 */
var editorProxy = zen_coding.exec(function(require, _) {
	function bytesToChar(bytes) {
		return ko.stringutils.charIndexFromPosition(editorProxy.getContent(), bytes);
	}

	function charsToByte(chars) {
		return  ko.stringutils.bytelength( editorProxy.getContent().substring(0, chars) );
	}
	
	function createSnippet(text, noIndent) {
		return {
			type: 'snippet',
			name: 'zen-snippet',
			parent: {name: 'zen-parent'},
			set_selection: false,
			indent_relative: !noIndent,
			value: text,
			hasAttribute: function(name) { return (name in this); },
			getStringAttribute: function(name) { return ('' + this[name]); }
		};
	}
	
	return {
		context: null,
		scimoz: null,
		
		/**
		 * Setup underlying editor context. You should call this method
		 * <code>before</code> using any Zen Coding action.
		 * @param {Object} context
		 */
		setContext: function(context) {
			this.context = context;
			this.scimoz = context.scintilla.scimoz;

			var res = require('resources');
			var utils = require('utils');
			
			var indentation = res.getVariable('indentation');
			if (this.scimoz.useTabs) {
				indentation = '\t';
			} else {
				indentation = utils.repeatString(' ', this.scimoz.indent);
			}
			
			res.setVariable('indentation', indentation);

			switch (this.scimoz.eOLMode) {
				case 0: // Windows
					utils.setNewline('\r\n');
					break;
				case 1: // MacOS classic
					utils.setNewline('\r');
					break;
				default: // Unix
					utils.setNewline('\n');
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
				start: bytesToChar(this.scimoz.selectionStart),
				end: bytesToChar(this.scimoz.selectionEnd)
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
			start = charsToByte(start);
			end = charsToByte(end);
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
				start: bytesToChar(this.scimoz.positionFromLine(line)),
				end: bytesToChar(this.scimoz.getLineEndPosition(line))
			};

			return result;
		},

		/**
		 * Returns current caret position
		 * @return {Number|null}
		 */
		getCaretPos: function(){
			var sel = this.getSelectionRange();
			return Math.min(sel.start, sel.end);
		},

		/**
		 * Set new caret position
		 * @param {Number} pos Caret position
		 */
		setCaretPos: function(pos){
			pos = charsToByte(pos);
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
		replaceContent: function(value, start, end, noIndent) {
			var content = this.getContent();
			
			if (_.isUndefined(end)) 
				end = _.isUndefined(start) ? content.length : start;
			if (_.isUndefined(start)) start = 0;
			
			// transform tabstops
			value = require('tabStops').processText(value, {
				escape: function(ch) {
					return ch;
				},
				
				tabstop: function(data) {
					if (data.group == '0')
						return '[[%tabstop:]]';
					
					if (data.placeholder)
						return '[[%tabstop' + data.group + ':' + data.placeholder + ']]';
					
					return '[[%tabstop' + data.group + ':]]';
				}
			});
			
			this.context.setFocus();
			this.scimoz.beginUndoAction();
			this.scimoz.targetStart = charsToByte(start);
			this.scimoz.targetEnd = charsToByte(end);
			this.scimoz.replaceTarget(0, '');
			
//			alert('replace content with ' + data[0]);
			this.setCaretPos(start);
			ko.abbrev.insertAbbrevSnippet(createSnippet(value, noIndent), this.context);
			this.scimoz.endUndoAction();
		},

		/**
		 * Returns editor's content
		 * @return {String}
		 */
		getContent: function(){
			return this.scimoz.text;
		},
		
		_doc: function() {
			return this.context.koDoc || this.context.document; 
		},

		/**
		 * Returns current editor's syntax mode
		 * @return {String}
		 */
		getSyntax: function(){
			var syntax = this._doc().language.toLowerCase();
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
		 * Returns current output profile name
		 * @return {String}
		 */
		getProfileName: function() {
			switch(this.getSyntax()) {
				 case 'xml':
				 case 'xsl':
				 	return 'xml';
				 case 'html':
				 	var profile = require('resources').getVariable('profile');
				 	if (!profile) { // no forced profile, guess from content
					 	// html or xhtml?
				 		profile = this.getContent().search(/<!DOCTYPE[^>]+XHTML/i) != -1 ? 'xhtml': 'html';
				 	}
	
				 	return profile;
			}
	
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
			var sel = this.getSelectionRange();
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
			return this._doc().file.URI;
		}
	};
});
