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
 * 
 * @include "../../javascript/zen_coding.js"
 * @include "shortcut.js"
 */
var zen_editor = (function(){
	/** @type {CodeMirror} */
	var mirror,
		know_syntaxes = {
			'html': 1,
			'css': 1,
			'xml': 1,
			'xml': 1,
			'haml': 1
		},
		
		/** Actions aliases */
		aliases = {
			balance_tag_inward: 'match_pair_inward',
			balance_tag_outward: 'match_pair_outward',
			previous_edit_point: 'prev_edit_point',
			pretty_break: 'insert_formatted_line_break'
		},
		
		shortcuts = {};
	
	/**
	 * Returns content of specified line
	 * @param {Number} num Line number (starting from 1, not 0)
	 * @return {String}
	 */
	function getLineContent(num) {
		return mirror.lineContent( mirror.nthLine(num) ) || '';
	}
	
	/**
	 * Calculate number of characters of previous lines, starting from current 
	 * cursor position
	 * @return {Number}
	 */
	function calculatePrevChars() {
		var result = 0,
			line_num = mirror.lineNumber(mirror.cursorLine()) - 1;
			
		while (line_num > 0) {
			result += getLineContent(line_num).length + 1;
			line_num--;
		}
		 
		return result;
	}
	
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
		var re_tabstop = /(\$\d+|\$\{\d+:[^\}]+\})/g,
			caret_placeholder = zen_coding.getCaretPlaceholder(),
			result = ['', -1, -1],
			caret_pos = text.indexOf(caret_placeholder),
			is_found = false;
			
		// find caret position
		if (caret_pos != -1) {
			text = text.split(caret_placeholder).join('');
		}
			
		result[0] = text.replace(re_tabstop, function(str, p1){
			if (!is_found) {
				is_found = true;
				
				result[1] = text.indexOf(p1);
				if (caret_pos != -1 && result[1] > caret_pos) { // placeholder too far
					result[1] = result[2] = caret_pos;
					return '';
				} else {
					p1 = p1.replace(/^\$\d+|^\$\{\d+:|\}$/g, '');
					result[2] = result[1] + p1.length;
					return p1;
				}
				
			} else {
				return '';
			}
		});
		
		if (result[1] == -1)
			result[1] = result[2] = caret_pos;
			
		return result;
	}
	
	function keysFilter(key_code, evt) {
		// test if occured event corresponds to one of the defined shortcut
		var sh, name, result;
		for (var s in shortcuts) if (shortcuts.hasOwnProperty(s)) {
			sh = shortcuts[s];
			if (shortcut.test(sh.compiled, evt)) {
				evt.preventDefault();
				name = aliases[sh.action] || sh.action;
				result = zen_coding.runAction(aliases[sh.action] || sh.action, [zen_editor]);
				return (name == 'expand_abbreviation') ? result : true;
			}
		}
		
		return false;
	}
	
	function actionManager() {}
	
	/**
	 * Returns object with <code>line</code> and <code>character</code> properties
	 * for specified character position. The returned object can be used with
	 * for navigating and selecting data in CodeMirror
	 */
	function getPosForCharacter(pos) {
		var start = 0,
			end = 0;
		for (var i = 1, il = mirror.lineNumber(mirror.lastLine()); i <= il; i++) {
			end = start + getLineContent(i).length;
			if (start <= pos && pos <= end) {
				return {line: mirror.nthLine(i), character: pos - start};
			}
				
			start = end + 1;
		}
		
		return null;
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
	
	return {
		/**
		 * Binds CodeMirror instance to Zen Coding
		 */
		bind: function(context) {
			var that = this;
			context.grabKeys(actionManager, function(key_code, evt){
				if (evt.type == 'keydown') {
					that.setContext(context);
					return keysFilter(key_code, evt);
				}
			});
		},
		
		/**
		 * Setup underlying editor context. You should call this method 
		 * <code>before</code> using any Zen Coding action.
		 * @param {CodeMirror} context
		 */
		setContext: function(context) {
			mirror = context;
			zen_coding.setVariable('indentation', zen_coding.repeatString(' ', mirror.options.indentUnit));
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
			var start_pos = getPosForCharacter(start);
			if (start == end) {
				mirror.selectLines(start_pos.line, start_pos.character);
			} else {
				var end_pos = getPosForCharacter(end);
				mirror.selectLines(start_pos.line, start_pos.character, end_pos.line, end_pos.character);
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
			var line_len = this.getCurrentLine().length,
				offset = calculatePrevChars();
			return {
				start: offset,
				end: offset + line_len
			};
		},
		
		/**
		 * Returns current caret position
		 * @return {Number|null}
		 */
		getCaretPos: function(){
			return mirror.cursorPosition().character + calculatePrevChars(); 
		},
		
		/**
		 * Set new caret position
		 * @param {Number} pos Caret position
		 */
		setCaretPos: function(pos){
			this.createSelection(pos, pos);
		},
		
		/**
		 * Returns content of current line
		 * @return {String}
		 */
		getCurrentLine: function() {
			return mirror.lineContent( mirror.cursorLine() ) || '';
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
			
			if (mirror.win.asEditorLines) {
				value = mirror.win.asEditorLines(value).join(zen_coding.getNewline());
			}
			
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
				mirror.editor.replaceSelection(value);
				this.createSelection(tabstop_res[1], tabstop_res[2]);
			} catch(e){}
		},
		
		/**
		 * Returns editor's content
		 * @return {String}
		 */
		getContent: function(){
			return mirror.getCode();
		},
		
		/**
		 * Returns current editor's syntax mode
		 * @return {String}
		 */
		getSyntax: function() {
			var syntax = mirror.options.syntax ||  '',
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
			if (mirror.options.profile)
				return mirror.options.profile;
				
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
			return mirror.selection() || '';
		},
		
		/**
		 * Returns current editor's file path
		 * @return {String}
		 * @since 0.65 
		 */
		getFilePath: function() {
			return '';
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