/**
 * High-level editor interface which communicates with other editor (like 
 * TinyMCE, CKEditor, etc.) or browser.
 * Before using any of editor's methods you should initialize it with
 * <code>editor.setContext(elem)</code> method and pass reference to 
 * &lt;textarea&gt; element.
 * @example
 * var textarea = document.getElemenetsByTagName('textarea')[0];
 * zen_editor.setContext(textarea);
 * //now you are ready to use editor object
 * zen_editor.getSelectionRange() 
 * 
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * @constructor
 * @memberOf __zenEditorTextarea
 */
var zen_editor = (function(){
	/** @param {Element} Source element */
	var target = null;
		
	var defaultOptions = {
		profile: 'xhtml',
		syntax: 'html',
		use_tab: false,
		pretty_break: false
	};
		
	var keyboardShortcuts = {};
		
	/** @type {default_options} Current options */
	var options = null;
	
		
	// different browser uses different newlines, so we have to figure out
	// native browser newline and sanitize incoming text with them
	var tx = document.createElement('textarea');
	tx.value = '\n';
	
	zen_coding.require('utils').setNewline(tx.value);
	tx = null;
	
	/**
	 * Returns content of current target element
	 */
	function getContent() {
		return target.value || '';
	}
	
	/**
	 * Returns selection indexes from element
	 */
	function getSelectionRange() {
		if ('selectionStart' in target) { // W3C's DOM
			var length = target.selectionEnd - target.selectionStart;
			return {
				start: target.selectionStart, 
				end: target.selectionEnd 
			};
		} else if (document.selection) { // IE
			target.focus();
	 
			var range = document.selection.createRange();
			
			if (range === null) {
				return {
					start: 0, 
					end: getContent().length
				};
			}
	 
			var re = target.createTextRange();
			var rc = re.duplicate();
			re.moveToBookmark(range.getBookmark());
			rc.setEndPoint('EndToStart', re);
	 
			return {
				start: rc.text.length, 
				end: rc.text.length + range.text.length
			};
		} else {
			return null;
		}
	}
	
	/**
	 * Creates text selection on target element
	 * @param {Number} start
	 * @param {Number} end
	 */
	function createSelection(start, end) {
		// W3C's DOM
		if (typeof(end) == 'undefined')
			end = start;
			
		if ('setSelectionRange' in target) {
			target.setSelectionRange(start, end);
		} else if ('createTextRange' in target) {
			var t = target.createTextRange();
			
			t.collapse(true);
			var utils = zen_coding.require('utils');
			var delta = utils.splitByLines(getContent().substring(0, start)).length - 1;
			
			// IE has an issue with handling newlines while creating selection,
			// so we need to adjust start and end indexes
			end -= delta + utils.splitByLines(getContent().substring(start, end)).length - 1;
			start -= delta;
			
			t.moveStart('character', start);
			t.moveEnd('character', end - start);
			t.select();
		}
	}
	
	/**
	 * Find start and end index of text line for <code>from</code> index
	 * @param {String} text 
	 * @param {Number} from 
	 */
	function findNewlineBounds(text, from) {
		var len = text.length,
			start = 0,
			end = len - 1;
		
		// search left
		for (var i = from - 1; i > 0; i--) {
			var ch = text.charAt(i);
			if (ch == '\n' || ch == '\r') {
				start = i + 1;
				break;
			}
		}
		// search right
		for (var j = from; j < len; j++) {
			var ch = text.charAt(j);
			if (ch == '\n' || ch == '\r') {
				end = j;
				break;
			}
		}
		
		return {start: start, end: end};
	}
	
	/**
	 * Returns current caret position
	 */
	function getCaretPos() {
		var selection = getSelectionRange();
		return selection ? selection.start : null;
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
	 * Get Zen Coding options from element's class name
	 */
	function getOptionsFromContext() {
		var param_str = target.className || '',
			re_param = /\bzc\-(\w+)\-(\w+)/g,
			m,
			result = copyOptions(options);
			
		while ( (m = re_param.exec(param_str)) ) {
			var key = m[1].toLowerCase(),
				value = m[2].toLowerCase();
			
			if (value == 'true' || value == 'yes' || value == '1')
				value = true;
			else if (value == 'false' || value == 'no' || value == '0')
				value = false;
				
			result[key] = value;
		}
		
		return result;
	}
	
	function getOption(name) {
		return getOptionsFromContext()[name];
	}
	
	function copyOptions(opt) {
		/** @type Underscore */
		var _ = zen_coding.require('_');
		return _.defaults(_.clone(opt || {}), defaultOptions);
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
		keyboardShortcuts[keystroke.toLowerCase()] = {
			compiled: shortcut.compile(keystroke),
			label: label,
			action: normalizeActionName(action_name || label)
		};
	}
	
	function stopEvent(evt) {
		evt.cancelBubble = true;
		evt.returnValue = false;

		if (evt.stopPropagation) {
			evt.stopPropagation();
			evt.preventDefault();
		}
	}
	
	/**
	 * Runs actions called by user
	 * @param {Event} evt Event object
	 */
	function runAction(evt) {
		evt = evt || window.event;
		
		/** @type {Element} */
		var target_elem = evt.target || evt.srcElement,
			key_code = evt.keyCode || evt.which,
			actionName;
			
		if (target_elem && target_elem.nodeType == 1 && target_elem.nodeName == 'TEXTAREA') {
			zen_editor.setContext(target_elem);
			
			// test if occured event corresponds to one of the defined shortcut
			var sh;
			for (var s in keyboardShortcuts) if (keyboardShortcuts.hasOwnProperty(s)) {
				sh = keyboardShortcuts[s];
				if (shortcut.test(sh.compiled, evt)) {
					actionName = sh.action;
					switch (actionName) {
						case 'expand_abbreviation':
							if (key_code == 9) {
								if (getOption('use_tab'))
									actionName = 'expand_abbreviation_with_tab';
								else
									// user pressed Tab key but it's forbidden in 
									// Zen Coding: bubble up event
									return true;
							}
							break;
						case 'insert_formatted_line_break':
							if (key_code == 13 && !getOption('pretty_break')) {
								// user pressed Enter but it's forbidden in 
								// Zen Coding: bubble up event
								return true;
							}
							break;
					}
					
					zen_coding.require('actions').run(actionName, zen_editor);
					stopEvent(evt);
					return false;
				}
			}
		}
			
		// allow event bubbling
		return true;
	}
	
	var doc = document, 
		key_event = window.opera ? 'keypress' : 'keydown';
		
	//Attach the function with the event
	if (doc.addEventListener) doc.addEventListener(key_event, runAction, false);
	else if(doc.attachEvent) ele.attachEvent('on' + key_event, runAction);
	else doc['on' + key_event] = func;
	
	options = copyOptions();
	
	addShortcut('Meta+E', 'Expand Abbreviation');
	addShortcut('Tab', 'Expand Abbreviation');
	addShortcut('Meta+D', 'Balance Tag Outward', 'match_pair_outward');
	addShortcut('Shift+Meta+D', 'Balance Tag inward', 'match_pair_inward');
	addShortcut('Shift+Meta+A', 'Wrap with Abbreviation');
	addShortcut('Ctrl+Alt+RIGHT', 'Next Edit Point');
	addShortcut('Ctrl+Alt+LEFT', 'Previous Edit Point', 'prev_edit_point');
	addShortcut('Meta+L', 'Select Line');
	addShortcut('Meta+Shift+M', 'Merge Lines');
	addShortcut('Meta+/', 'Toggle Comment');
	addShortcut('Meta+J', 'Split/Join Tag');
	addShortcut('Meta+K', 'Remove Tag');
	addShortcut('Ctrl+I', 'Update image size');
	
	addShortcut('Enter', 'Insert Formatted Line Break');
	
	// v0.7
	addShortcut('Meta+Y', 'Evaluate Math Expression');
	addShortcut('Ctrl+UP', 'Increment number by 1');
	addShortcut('Ctrl+DOWN', 'Decrement number by 1');
	addShortcut('Alt+UP', 'Increment number by 0.1');
	addShortcut('Alt+DOWN', 'Decrement number by 0.1');
	addShortcut('Ctrl+Alt+UP', 'Increment number by 10');
	addShortcut('Ctrl+Alt+DOWN', 'Decrement number by 10');
	
	addShortcut('Meta+.', 'Select Next Item');
	addShortcut('Meta+,', 'Select Previous Item');
	addShortcut('Meta+Shift+B', 'Reflect CSS Value');
	
	return {
		/** @memberOf zen_editor */
		setContext: function(elem) {
			target = elem;
		},
		
		getSelectionRange: getSelectionRange,
		createSelection: createSelection,
		
		/**
		 * Returns current line's start and end indexes
		 */
		getCurrentLineRange: function() {
			var caret_pos = getCaretPos(),
				content = getContent();
			if (caret_pos === null) return null;
			
			return findNewlineBounds(content, caret_pos);
		},
		
		/**
		 * Returns current caret position
		 * @return {Number}
		 */
		getCaretPos: getCaretPos,
		
		/**
		 * Set new caret position
		 * @param {Number} pos Caret position
		 */
		setCaretPos: function(pos) {
			createSelection(pos);
		},
		
		/**
		 * Returns content of current line
		 * @return {String}
		 */
		getCurrentLine: function() {
			var range = this.getCurrentLineRange();
			return range.start < range.end ? this.getContent().substring(range.start, range.end) : '';
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
			var content = getContent();
			var utils = zen_coding.require('utils');
			
			if (_.isUndefined(end)) 
				end = _.isUndefined(start) ? content.length : start;
			if (_.isUndefined(start)) start = 0;
			
			// indent new value
			if (!noIndent) {
				var lineRange = utils.findNewlineBounds(content, start);
				value = utils.padString(value, utils.getLinePadding(lineRange.substring(content)));
			}
			
			// find new caret position
			var tabstopData = zen_coding.require('tabStops').extract(value);
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
				
			try {
				target.value = utils.replaceSubstring(content, value, start, end);
				this.createSelection(firstTabStop.start, firstTabStop.end);
			} catch(e){}
		},
		
		/**
		 * Returns editor's content
		 * @return {String}
		 */
		getContent: getContent,
		
		/**
		 * Returns current editor's syntax mode
		 * @return {String}
		 */
		getSyntax: function(){
			var syntax = this.getOption('syntax'),
				caret_pos = this.getCaretPos();
				
			if (!zen_coding.require('resources').hasSyntax(syntax))
				syntax = 'html';
				
			if (syntax == 'html') {
				// get the context tag
				var pair = zen_coding.require('html_matcher').getTags(this.getContent(), caret_pos);
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
			return this.getOption('profile');
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
			return location.href;
		},
		
		/**
		 * Custom editor method: set default options (like syntax, tabs, 
		 * etc.) for editor
		 * @param {Object} opt
		 */
		setOptions: function(opt) {
			options = copyOptions(opt);
		},
		
		/**
		 * Custom method: returns current context's option value
		 * @param {String} name Option name
		 * @return {String} 
		 */
		getOption: getOption,
		
		addShortcut: addShortcut,
		
		/**
		 * Removes shortcut binding
		 * @param {String} keystroke
		 */
		unbindShortcut: function(keystroke) {
			keystroke = keystroke.toLowerCase();
			if (keystroke in keyboardShortcuts)
				delete keyboardShortcuts[keystroke];
		},
				
		/**
		 * Returns array of binded actions and their keystrokes
		 * @return {Array}
		 */
		getShortcuts: function() {
			var result = [], lp;
			
			for (var p in keyboardShortcuts) if (keyboardShortcuts.hasOwnProperty(p)) {
				lp = p.toLowerCase();
				
				// skip some internal bindings
				if (lp == 'tab' || lp == 'enter')
					continue;
					
				result.push({
					keystroke: shortcut.format(p),
					compiled: keyboardShortcuts[p].compiled,
					label: keyboardShortcuts[p].label,
					action: keyboardShortcuts[p].action
				});
			}
			
			return result;
		},
		
		getInfo: function() {
			var message = 'This textareas on this page are powered by Zen Coding project: ' +
					'a set of tools for fast HTML coding.\n\n' +
					'Available shortcuts:\n';
					
			var sh = this.getShortcuts(),
				actions = [];
				
			for (var i = 0; i < sh.length; i++) {
				actions.push(sh[i].keystroke + ' — ' + sh[i].label);
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
		
		/**
		 * Setup editor. Pass object with values defined in 
		 * <code>default_options</code>
		 */
		setup: function(opt) {
			this.setOptions(opt);
		}
	};
})();
 