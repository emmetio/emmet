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
var zen_editor = (function(){
	/** @type {CodeMirror} */
	var mirror,
		
		/** Actions aliases */
		aliases = {
			balance_tag_inward: 'match_pair_inward',
			balance_tag_outward: 'match_pair_outward',
			previous_edit_point: 'prev_edit_point',
			pretty_break: 'insert_formatted_line_break'
		},
		
		shortcuts = {};
	
	/**
	 * Returns whitrespace padding of string
	 * @param {String} str String line
	 * @return {String}
	 */
	function getStringPadding(str) {
		return (str.match(/^(\s+)/) || [''])[0];
	}
	
	/**
	 * Handle tab-stops (like $1 or ${1:label}) inside text: find first tab-stop,
	 * marks it as selection, remove the rest. If tab-stop wasn't found, search
	 * for caret placeholder and use it as selection
	 * @param {String} text
	 * @return {Array} Array with new text and selection indexes (['...', -1,-1] 
	 * if there's no selection)
	 */
	function handleTabStops(text) {
		var selection_len = 0,
			caret_pos = text.indexOf(zen_coding.getCaretPlaceholder()),
			placeholders = {};
			
		// find caret position
		if (caret_pos != -1) {
			text = text.split(zen_coding.getCaretPlaceholder()).join('');
		} else {
			caret_pos = text.length;
		}
		
		text = zen_coding.processTextBeforePaste(text, 
			function(ch){ return ch; }, 
			function(i, num, val) {
				if (val) placeholders[num] = val;
				
				if (i < caret_pos) {
					caret_pos = i;
					if (val)
						selection_len = val.length;
				}
					
				return placeholders[num] || '';
			});
		
		return [text, caret_pos, caret_pos + selection_len];
	}
	
	function keysFilter(evt) {
		// test if occured event corresponds to one of the defined shortcut
		var sh, name, result;
		for (var s in shortcuts) if (shortcuts.hasOwnProperty(s)) {
			sh = shortcuts[s];
			if (shortcut.test(sh.compiled, evt)) {
				evt.preventDefault();
				name = aliases[sh.action] || sh.action;
				result = zen_coding.runAction(name, [zen_editor]);
				return (name == 'expand_abbreviation') ? result : true;
			}
		}
		
		return false;
	}
	
	/**
	 * Returns normalized action name
	 * @param {String} name Action name (like 'Expand Abbreviation')
	 * @return Normalized name for coding (like 'expand_abbreviation')
	 */
	function normalizeActionName(name) {
		return name
			.replace(/(^\s+|\s+$)/g, '') // remove trailing spaces
			.replace(/[\s\\\/]+/g, '_')
			.replace(/\./g, '')
			.toLowerCase();
	}
	
	/**
	 * Bind shortcut to Zen Coding action
	 * @param {String} keystroke
	 * @param {String} label
	 * @param {String} action_name
	 */
	function addShortcut(keystroke, label, action_name) {
		shortcuts[keystroke.toLowerCase()] = {
			compiled: shortcut.compile(keystroke),
			label: label,
			action: normalizeActionName(action_name || label)
		};
	}
	
	// add default shortcuts
	addShortcut('Meta+E', 'Expand Abbreviation');
	addShortcut('Tab', 'Expand Abbreviation');
	addShortcut('Meta+D', 'Balance Tag Outward');
	addShortcut('Shift+Meta+D', 'Balance Tag inward');
	addShortcut('Shift+Meta+A', 'Wrap with Abbreviation');
	addShortcut('Ctrl+Alt+RIGHT', 'Next Edit Point');
	addShortcut('Ctrl+Alt+LEFT', 'Previous Edit Point');
	addShortcut('Meta+L', 'Select Line');
	addShortcut('Meta+Shift+M', 'Merge Lines');
	addShortcut('Meta+/', 'Toggle Comment');
	addShortcut('Meta+J', 'Split/Join Tag');
	addShortcut('Meta+K', 'Remove Tag');
	addShortcut('Meta+Y', 'Evaluate Math Expression');
	
	addShortcut('Ctrl+UP', 'Increment number by 1');
	addShortcut('Ctrl+DOWN', 'Decrement number by 1');
	addShortcut('Alt+UP', 'Increment number by 0.1');
	addShortcut('Alt+DOWN', 'Decrement number by 0.1');
	addShortcut('Ctrl+Alt+UP', 'Increment number by 10');
	addShortcut('Ctrl+Alt+DOWN', 'Decrement number by 10');
	
	addShortcut('Meta+.', 'Select Next Item');
	addShortcut('Meta+,', 'Select Previous Item');
	addShortcut('Meta+B', 'Reflect CSS Value');
	
	return {
		/**
		 * Key handle for CodeMirror key events. You should pass this method as
		 * <code>onKeyEvent</code> handler in order to add Zen Coding 
		 * functionality to CodeMirror editor instance
		 */
		handleKeyEvent: function(editor, evt) {
			if (evt.type == 'keydown') {
				this.setContext(editor);
				return keysFilter(evt);
			}
		},
		
		/**
		 * Setup underlying editor context. You should call this method 
		 * <code>before</code> using any Zen Coding action.
		 * @param {CodeMirror} context
		 */
		setContext: function(context) {
			mirror = context;
			zen_coding.setVariable('indentation', zen_coding.repeatString(' ', mirror.getOption('indentUnit')));
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
			var caret_pos = this.getCaretPos();
			return {
				start: caret_pos,
				end: caret_pos + this.getSelection().length
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
			if (start == end) {
				mirror.setCursor(mirror.posFromIndex(start));
			} else {
				mirror.setSelection(mirror.posFromIndex(start), mirror.posFromIndex(end));
			}
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
			var caret = mirror.getCursor(true);
			
			return {
				start: mirror.indexFromPos({line: caret.line, ch: 0}),
				end: mirror.indexFromPos({line: caret.line, ch: mirror.getLine(caret.line).length})
			};
		},
		
		/**
		 * Returns current caret position
		 * @return {Number|null}
		 */
		getCaretPos: function(){
			return mirror.indexFromPos(mirror.getCursor(true));
		},
		
		/**
		 * Set new caret position
		 * @param {Number} pos Caret position
		 */
		setCaretPos: function(pos){
//			mirror.setCursor(mirror.posFromIndex(pos));
			this.createSelection(pos, pos);
		},
		
		/**
		 * Returns content of current line
		 * @return {String}
		 */
		getCurrentLine: function() {
			return mirror.getLine( mirror.getCursor(true).line ) || '';
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
		 */
		replaceContent: function(value, start, end) {
			var caret_pos = this.getCaretPos(),
				start = typeof(start) !== 'undefined' ? start : 0,
				end = typeof(end) !== 'undefined' ? end : this.getContent().length;
				
			// indent new value
			value = zen_coding.padString(value, getStringPadding(this.getCurrentLine()));
			
//			if (mirror.win.asEditorLines) {
//				value = mirror.win.asEditorLines(value).join(zen_coding.getNewline());
//			}
			
			// find new caret position
			var tabstop_res = handleTabStops(value);
			value = tabstop_res[0];
			
			start = start || 0;
			if (tabstop_res[1] !== -1) {
				tabstop_res[1] += start;
				tabstop_res[2] += start;
			} else {
				tabstop_res[1] = tabstop_res[2] = value.length + start;
			}
			
			try {
				this.createSelection(start, end);
				mirror.replaceSelection(value);
				this.createSelection(tabstop_res[1], tabstop_res[2]);
			} catch(e){}
		},
		
		/**
		 * Returns editor's content
		 * @return {String}
		 */
		getContent: function(){
			return mirror.getValue();
		},
		
		/**
		 * Returns current editor's syntax mode
		 * @return {String}
		 */
		getSyntax: function() {
			var syntax = mirror.getOption('syntax') ||  '',
				caret_pos = this.getCaretPos();
				
			if (!zen_resources.hasSyntax(syntax))
				syntax = 'html';
				
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
			if (mirror.getOption('profile'))
				return mirror.getOption('profile');
				
			switch(this.getSyntax()) {
				 case 'xml':
				 case 'xsl':
				 	return 'xml';
				 case 'html':
				 	var profile = zen_coding.getVariable('profile');
				 	if (!profile) { // no forced profile, guess from content
					 	// html or xhtml?
				 		profile = this.getContent().search(/<!DOCTYPE[^>]+XHTML/) != -1 ? 'xhtml': 'html';
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
			return prompt(title);
		},
		
		/**
		 * Returns current selection
		 * @return {String}
		 * @since 0.65
		 */
		getSelection: function() {
			return mirror.getSelection() || '';
		},
		
		/**
		 * Returns current editor's file path
		 * @return {String}
		 * @since 0.65 
		 */
		getFilePath: function() {
			return location.href;
		},
		
		shortcut: addShortcut,
		
		/**
		 * Removes shortcut binding
		 * @param {String} keystroke
		 */
		unbindShortcut: function(keystroke) {
			keystroke = keystroke.toLowerCase();
			if (keystroke in shortcuts)
				delete shortcuts[keystroke];
		},
				
		/**
		 * Returns array of binded actions and their keystrokes
		 * @return {Array}
		 */
		getShortcuts: function() {
			var result = [], lp;
			
			for (var p in shortcuts) if (shortcuts.hasOwnProperty(p)) {
				lp = p.toLowerCase();
				
				// skip some internal bindings
				if (lp == 'tab' || lp == 'enter')
					continue;
					
				result.push({
					keystroke: shortcut.format(p), 
					compiled: shortcuts[p].compiled,
					label: shortcuts[p].label,
					action: shortcuts[p].action
				});
			}
			
			return result;
		},
		
		getInfo: function() {
			var message = 'This CodeMirror editor is powered by Zen Coding project: ' +
					'a set of tools for fast HTML coding.\n\n' +
					'Available shortcuts:\n';
					
			var sh = this.getShortcuts(),
				actions = [];
				
			for (var i = 0; i < sh.length; i++) {
				actions.push(sh[i].keystroke + ' — ' + sh[i].label)
			}
			
			message += actions.join('\n') + '\n\n';
			message += 'More info on http://code.google.com/p/zen-coding/';
			
			return message;
		},
		
		/**
		 * Show info window about Zen Coding
		 */
		showInfo: function() {
			alert(this.getInfo());
		},
		
		// expose some core Zen Coding objects
		
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
	}
})();