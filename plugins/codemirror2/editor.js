/**
 * Implementation of {@link IEmmetEditor} interface for CodeMirror2
 * @param {Function} require
 * @param {Underscore} _
 */
emmet.define('cm-editor-proxy', function(require, _) {
	var ios = /AppleWebKit/.test(navigator.userAgent) && /Mobile\/\w+/.test(navigator.userAgent);
	var mac = ios || /Mac/.test(navigator.platform);
	var keymap = {
		'Cmd-E': 'expand_abbreviation',
		'Tab': 'expand_abbreviation_with_tab',
		'Cmd-D': 'match_pair_outward',
		'Shift-Cmd-D': 'match_pair_inward',
		'Cmd-T': 'matching_pair',
		'Shift-Cmd-A': 'wrap_with_abbreviation',
		'Ctrl-Alt-Right': 'next_edit_point',
		'Ctrl-Alt-Left': 'prev_edit_point',
		'Cmd-L': 'select_line',
		'Cmd-Shift-M': 'merge_lines',
		'Cmd-/': 'toggle_comment',
		'Cmd-J': 'split_join_tag',
		'Cmd-K': 'remove_tag',
		'Shift-Cmd-Y': 'evaluate_math_expression',

		'Ctrl-Up': 'increment_number_by_1',
		'Ctrl-Down': 'decrement_number_by_1',
		'Alt-Up': 'increment_number_by_01',
		'Alt-Down': 'decrement_number_by_01',
		'Ctrl-Alt-Up': 'increment_number_by_10',
		'Ctrl-Alt-Down': 'decrement_number_by_10',

		'Shift-Cmd-.': 'select_next_item',
		'Shift-Cmd-,': 'select_previous_item',
		'Cmd-B': 'reflect_css_value',
		
		'Enter': 'insert_formatted_line_break_only'
	};
	
	var modeMap = {
		'text/html': 'html',
		'application/xml': 'xml',
		'text/xsl': 'xsl',
		'text/css': 'css',
		'text/x-less': 'less'
	};
	
	// add “profile” property to CodeMirror defaults so in won’t be lost
	// then CM instance is instantiated with “profile” property
	if (CodeMirror.defineOption) {
		CodeMirror.defineOption('profile', 'html');
	} else {
		CodeMirror.defaults.profile = 'html';
	}
	
	var editorProxy = {
		context: null,

		getSelectionRange: function() {
			var caretPos = this.getCaretPos();
			return {
				start: caretPos,
				end: caretPos + this.getSelection().length
			};
		},

		createSelection: function(start, end) {
			if (start == end) {
				this.context.setCursor(this.context.posFromIndex(start));
			} else {
				this.context.setSelection(this.context.posFromIndex(start), this.context.posFromIndex(end));
			}
		},

		getCurrentLineRange: function() {
			var caret = this.context.getCursor(true);
			return {
				start: this.context.indexFromPos({line: caret.line, ch: 0}),
				end:   this.context.indexFromPos({line: caret.line, ch: this.context.getLine(caret.line).length})
			};
		},

		getCaretPos: function(){
			return this.context.indexFromPos(this.context.getCursor(true));
		},

		setCaretPos: function(pos){
			this.createSelection(pos, pos);
		},

		getCurrentLine: function() {
			return this.context.getLine( this.context.getCursor(true).line ) || '';
		},

		replaceContent: function(value, start, end, noIndent) {
			
			if (_.isUndefined(end)) 
				end = _.isUndefined(start) ? content.length : start;
			if (_.isUndefined(start)) start = 0;
			var utils = require('utils');
			
			// indent new value
			if (!noIndent) {
				value = utils.padString(value, utils.getLinePaddingFromPosition(this.getContent(), start));
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
				
			// do a compound change to record all changes into single undo event
			var that = this;
			var op = this.context.operation || this.context.compoundChange;
			op.call(this.context, function() {
				that.context.replaceRange(value, that.context.posFromIndex(start), that.context.posFromIndex(end));
				that.createSelection(firstTabStop.start, firstTabStop.end);
			});
		},

		getContent: function(){
			return this.context.getValue();
		},

		getSyntax: function() {
			var syntax = this.context.getOption('mode');
			if (syntax in modeMap) {
				syntax = modeMap[syntax];
			}
			
			return require('actionUtils').detectSyntax(this, syntax);
		},

		/**
		 * Returns current output profile name (@see emmet#setupProfile)
		 * @return {String}
		 */
		getProfileName: function() {
			if (this.context.getOption('profile'))
				return this.context.getOption('profile');
			
			return require('actionUtils').detectProfile(this);
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
			return this.context.getSelection() || '';
		},

		/**
		 * Returns current editor's file path
		 * @return {String}
		 * @since 0.65 
		 */
		getFilePath: function() {
			return location.href;
		},

		setupContext: function(ctx) {
			this.context = ctx;
			var indentation = '\t';
			if (!ctx.getOption('indentWithTabs')) {
				indentation = require('utils').repeatString(' ', ctx.getOption('indentUnit'));
			}
			
			require('resources').setVariable('indentation', indentation);
		},

		addAction: function(commandName, keybinding) {
			// register Emmet command as predefined CodeMirror command
			// for latter use
			var cmCommand = 'emmet.' + commandName;
			if (!CodeMirror.commands[cmCommand]) {
				CodeMirror.commands[cmCommand] = function(editor) {
					return runEmmetCommand(commandName, editor);
				};
			}

			if (keybinding) {
				if (!CodeMirror.defaults.extraKeys)
					CodeMirror.defaults.extraKeys = {};

				if (!mac)
					keybinding = keybinding.replace('Cmd', 'Ctrl');

				CodeMirror.defaults.extraKeys[keybinding] = cmCommand;
			}			
		}
	};
	
	function isValidSyntax() {
		var syntax = editorProxy.getSyntax();
		return require('resources').hasSyntax(syntax);
	}
	
	function runEmmetCommand(name, editor) {
		editorProxy.setupContext(editor);
		if (name == 'expand_abbreviation_with_tab' && (editorProxy.getSelection() || !isValidSyntax())) {
			// pass through Tab key handler if there's a selection
			throw CodeMirror.Pass;
		}
		var success = true;
		
		try {
			var result = require('actions').run(name, editorProxy);
			// a bit weird fix for the following action (actually, for their
			// keybindings) to prevent CM2 from inserting block characters
			if (name == 'next_edit_point' || name == 'prev_edit_point') {
				editor.replaceSelection('');
			}
			
			if (!result && name == 'insert_formatted_line_break_only') {
				success = false;
			}
		} catch (e) {}
		
		if (!success) {
			throw CodeMirror.Pass;
		}
	}
	
	// add keybindings to CodeMirror
	if (typeof emmetKeymap != 'undefined') {
		keymap = emmetKeymap;
	}
	
	_.each(keymap, editorProxy.addAction);

	return editorProxy;
});
