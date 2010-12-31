/**
 * Editor manager that handles all incoming events and runs Zen Coding actions.
 * This manager is also used for setting up editor preferences
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * 
 * @include "../../javascript/zen_coding.js"
 * @include "zen_editor.js"
 * @include "shortcut.js"
 */zen_textarea = (function(){ // should be global
	var mac_char_map = {
		'ctrl': '⌃',
		'control': '⌃',
		'meta': '⌘',
		'shift': '⇧',
		'alt': '⌥',
		'enter': '⏎',
		'tab': '⇥',
		'left': '←',
		'right': '→'
	},
	
	pc_char_map = {
		'left': '←',
		'right': '→'
	},
	
	/** Actions aliases */
	aliases = {
		balance_tag_inward: 'match_pair_inward',
		balance_tag_outward: 'match_pair_outward',
		previous_edit_point: 'prev_edit_point',
		pretty_break: 'insert_formatted_line_break'
	},
	
	shortcuts = {},
	is_mac = /mac\s+os/i.test(navigator.userAgent);
	
	/**
	 * Makes first letter of string in uppercase
	 * @param {String} str
	 */
	function capitalize(str) {
		return str.charAt().toUpperCase() + str.substring(1);
	}
	
	function humanize(str) {
		return capitalize(str.replace(/_(\w)/g, function(s, p){return ' ' + p.toUpperCase()}));
	}
	
	function formatShortcut(char_map, glue) {
		var result = [];
		if (typeof(glue) == 'undefined')
			glue = '+';
			
		for (var p in shortcuts) if (shortcuts.hasOwnProperty(p)) {
			var keys = p.split('+'),
				ar = [],
				lp = p.toLowerCase();
				
			if (lp == 'tab' || lp == 'enter')
				continue;
				
			for (var i = 0; i < keys.length; i++) {
				var key = keys[i].toLowerCase();
				ar.push(key in char_map ? char_map[key] : capitalize(key));
			}
			
			result.push({
				'keystroke': ar.join(glue), 
				'action_name': humanize(shortcuts[p])
			});
		}
		
		return result;
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
	 * Runs actions called by user
	 * @param {String} name Normalized action name
	 * @param {Event} evt Event object
	 */
	function runAction(name, evt) {
		/** @type {Element} */
		var target_elem = evt.target || evt.srcElement,
			key_code = evt.keyCode || evt.which;
			
		if (target_elem && target_elem.nodeType == 1 && target_elem.nodeName == 'TEXTAREA') {
			zen_editor.setContext(target_elem);
			
			var action_name = aliases[name] || name,
				args = [zen_editor];
			
			switch (action_name) {
				case 'expand_abbreviation':
					if (key_code == 9) {
						if (zen_editor.getOption('use_tab'))
							action_name = 'expand_abbreviation_with_tab';
						else
							// user pressed Tab key but it's forbidden in 
							// Zen Coding: bubble up event
							return true;
					}
					break;
				case 'wrap_with_abbreviation':
					var abbr = prompt('Enter abbreviation', 'div');
					if (!abbr)
						return false;
					else
						args.push(abbr);
					break;
				case 'insert_formatted_line_break':
					if (key_code == 13 && !zen_editor.getOption('pretty_break')) {
						// user pressed Enter but it's forbidden in 
						// Zen Coding: bubble up event
						return true;
					}
					break;
			}
			
			zen_coding.runAction(action_name, args);
		} else {
			// allow event bubbling
			return true;
		}
	}
	
	/**
	 * Bind shortcut to Zen Coding action
	 * @param {String} keystroke
	 * @param {String} action_name
	 */
	function addShortcut(keystroke, action_name) {
		action_name = normalizeActionName(action_name);
		shortcuts[keystroke.toLowerCase()] = action_name;
		shortcut.add(keystroke, function(evt){
			return runAction(action_name, evt);
		});
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
	
	addShortcut('Ctrl+N', 'Select Next Item');
	
	addShortcut('Enter', 'Insert Formatted Line Break');
	
	return {
		shortcut: addShortcut,
		
		/**
		 * Removes shortcut binding
		 * @param {String} keystroke
		 */
		unbindShortcut: function(keystroke) {
			keystroke = keystroke.toLowerCase();
			if (keystroke in shortcuts)
				delete shortcuts[keystroke];
			shortcut.remove(keystroke);
		},
		
		/**
		 * Setup editor. Pass object with values defined in 
		 * <code>default_options</code>
		 */
		setup: function(opt) {
			zen_editor.setOptions(opt);
		},
		
		/**
		 * Returns option value
		 */
		getOption: function(name) {
			return zen_editor.getOption(name);
		},
		
		/**
		 * Returns array of binded actions and their keystrokes
		 * @return {Array}
		 */
		getShortcuts: function() {
			return formatShortcut(is_mac ? mac_char_map : pc_char_map, is_mac ? '' : '+');
		},
		
		/**
		 * Show info window about Zen Coding
		 */
		showInfo: function() {
			var message = 'All textareas on this page are powered by Zen Coding project: ' +
					'a set of tools for fast HTML coding.\n\n' +
					'Available shortcuts:\n';
					
			var sh = this.getShortcuts(),
				actions = [];
				
			for (var i = 0; i < sh.length; i++) {
				actions.push(sh[i].keystroke + ' — ' + sh[i].action_name)
			}
			
			message += actions.join('\n') + '\n\n';
			message += 'More info on http://code.google.com/p/zen-coding/';
			
			alert(message);
		}
	}
})();