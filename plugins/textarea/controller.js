/**
 * Controller for Emmet for textarea plugin: handles user interaction
 * and calls Emmet commands
 * @param {Function} require
 * @param {Underscore} _
 */
emmet.define('textarea', function(require, _) {
	var keymap = {
		'Meta+E': 'expand_abbreviation',
		'Tab': 'expand_abbreviation',
		'Meta+D': 'match_pair_outward',
		'Shift+Meta+D': 'match_pair_inward',
		'Shift+Meta+A': 'wrap_with_abbreviation',
		'Ctrl+Alt+Right': 'next_edit_point',
		'Ctrl+Alt+Left': 'prev_edit_point',
		'Meta+L': 'select_line',
		'Meta+Shift+M': 'merge_lines',
		'Meta+/': 'toggle_comment',
		'Meta+J': 'split_join_tag',
		'Meta+K': 'remove_tag',
		'Shift+Meta+Y': 'evaluate_math_expression',
		
		'Ctrl+Up': 'increment_number_by_1',
		'Ctrl+Down': 'decrement_number_by_1',
		'Alt+Up': 'increment_number_by_01',
		'Alt+Down': 'decrement_number_by_01',
		'Ctrl+Alt+Up': 'increment_number_by_10',
		'Ctrl+Alt+Down': 'decrement_number_by_10',
		
		'Meta+.': 'select_next_item',
		'Meta+,': 'select_previous_item',
		'Meta+Shift+B': 'reflect_css_value',
		
		'Enter': 'insert_formatted_line_break'
	};
	
	var defaultOptions = {
//		profile: 'xhtml',
		syntax: 'html',
		use_tab: false,
		pretty_break: false
	};
		
	var keyboardShortcuts = {};
	var options = {};
	
	
	/**
	 * Get Emmet options from element's class name
	 */
	function getOptionsFromContext() {
		var paramStr = require('editor').getContext().className || '';
		var reParam = /\bemmet\-(\w+)\-(\w+)/g;
		var result = copyOptions(options);
		var m;
			
		while ( (m = reParam.exec(paramStr)) ) {
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
		return _.extend({}, defaultOptions, opt || {});
	}
	
	/**
	 * Bind shortcut to Emmet action
	 * @param {String} keystroke
	 * @param {String} label
	 * @param {String} actionName
	 */
	function addShortcut(keystroke, actionName) {
		keyboardShortcuts[keystroke.toLowerCase()] = {
			compiled: require('shortcut').compile(keystroke),
			action: actionName
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
		var targetElem = evt.target || evt.srcElement;
		var keyCode = evt.keyCode || evt.which;
		
		var editor = require('editor');
		var shortcut = require('shortcut');
			
		if (targetElem && targetElem.nodeType == 1 && targetElem.nodeName == 'TEXTAREA') {
			editor.setContext(targetElem);
			
			// test if occurred event corresponds to one of the defined shortcut
			return !_.find(keyboardShortcuts, function(sh) {
				if (shortcut.test(sh.compiled, evt)) {
					var actionName = sh.action;
					switch (actionName) {
						case 'expand_abbreviation':
							if (keyCode == 9) {
								if (getOption('use_tab'))
									actionName = 'expand_abbreviation_with_tab';
								else
									// user pressed Tab key but it's forbidden in 
									// Emmet: bubble up event
									return false;
							}
							break;
						case 'insert_formatted_line_break':
							if (keyCode == 13 && !getOption('pretty_break')) {
								// user pressed Enter but it's forbidden in 
								// Emmet: bubble up event
								return false;
							}
							break;
					}
					
					require('actions').run(actionName, editor);
					stopEvent(evt);
					return true;
				}
			});
		}
			
		// allow event bubbling
		return true;
	}
	
	var doc = document;
//	var keyEvent = window.opera ? 'keypress' : 'keydown';
	var keyEvent = 'keydown';
		
	//Attach the function with the event
	if (doc.addEventListener) doc.addEventListener(keyEvent, runAction, false);
	else if(doc.attachEvent) ele.attachEvent('on' + keyEvent, runAction);
	else doc['on' + keyEvent] = func;
	
	options = copyOptions();
	_.each(keymap, function(actionName, keystroke) {
		addShortcut(keystroke, actionName);
	});
	
	return {
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
			var shortcut = require('shortcut');
			var actions = require('actions');
			return _.compact(_.map(keyboardShortcuts, function(sh, key) {
				var keyLower = key.toLowerCase();
				
				// skip some internal bindings
				if (keyLower == 'tab' || keyLower == 'enter')
					return;
					
				return {
					keystroke: shortcut.format(key),
					compiled: sh.compiled,
					label: _.last((actions.get(sh.action).options.label || sh.action).split('/')),
					action: sh.action
				};
			}));
		},
		
		getInfo: function() {
			var message = 'This textareas on this page are powered by Emmet toolkit.\n\n' +
					'Available shortcuts:\n';
			var actions = _.map(this.getShortcuts(), function(shortcut) {
				return shortcut.keystroke + ' — ' + shortcut.label;
			});
			
			message += actions.join('\n') + '\n\n';
			message += 'More info on http://emmet.io/';
			
			return message;
		},
		
		/**
		 * Show info window about Emmet
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
});