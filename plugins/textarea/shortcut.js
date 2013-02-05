/**
 * Tests if passed keydown/keypress event corresponds to defied shortcut 
 * 
 * Based on http://www.openjs.com/scripts/events/keyboard_shortcuts/
 * By Binny V A
 * License : BSD
 */
emmet.define('shortcut', function(){
	var is_opera = !!window.opera,
		is_mac = /mac\s+os/i.test(navigator.userAgent),
		//Work around for stupid Shift key bug created by using lowercase - as a result the shift+num combination was broken
		shift_nums = {
			"`":"~",
			"1":"!",
			"2":"@",
			"3":"#",
			"4":"$",
			"5":"%",
			"6":"^",
			"7":"&",
			"8":"*",
			"9":"(",
			"0":")",
			"-":"_",
			"=":"+",
			";":":",
			"'":"\"",
			",":"<",
			".":">",
			"/":"?",
			"\\":"|"
		},
		
		//Special Keys - and their codes
		special_keys = {
			'esc':27,
			'escape':27,
			'tab':9,
			'space':32,
			'return':13,
			'enter':13,
			'backspace':8,
	
			'scrolllock':145,
			'scroll_lock':145,
			'scroll':145,
			'capslock':20,
			'caps_lock':20,
			'caps':20,
			'numlock':144,
			'num_lock':144,
			'num':144,
			
			'pause':19,
			'break':19,
			
			'insert':45,
			'home':36,
			'delete':46,
			'end':35,
			
			'pageup':33,
			'page_up':33,
			'pu':33,
	
			'pagedown':34,
			'page_down':34,
			'pd':34,
			
			'plus': 187,
			'minus': 189,
	
			'left':37,
			'up':38,
			'right':39,
			'down':40,
	
			'f1':112,
			'f2':113,
			'f3':114,
			'f4':115,
			'f5':116,
			'f6':117,
			'f7':118,
			'f8':119,
			'f9':120,
			'f10':121,
			'f11':122,
			'f12':123
		},
		
		mac_char_map = {
			'ctrl': '⌃',
			'control': '⌃',
			'meta': '⌘',
			'shift': '⇧',
			'alt': '⌥',
			'enter': '⏎',
			'tab': '⇥',
			'left': '←',
			'right': '→',
			'up': '↑',
			'down': '↓'
		},
		
		pc_char_map = {
			'meta': 'Ctrl',
			'control': 'Ctrl',
			'left': '←',
			'right': '→',
			'up': '↑',
			'down': '↓'
		},
		
		MODIFIERS = {
			SHIFT: 1,
			CTRL:  2,
			ALT:   4,
			META:  8
		};
		
	/**
	 * Makes first letter of string in uppercase
	 * @param {String} str
	 */
	function capitalize(str) {
		return str.charAt().toUpperCase() + str.substring(1);
	}
		
	return {
		/**
		 * Compile keyboard combination for faster tests
		 * @param {String|Object} combination
		 */
		compile: function(combination) {
			if (typeof combination != 'string') //already compiled
				return combination;
				
			var mask = 0,
				keys = combination.toLowerCase().split('+'), 
				key,
				k;
				
			for(var i = 0, il = keys.length; i < il; i++) {
				k = keys[i];
				if (!is_mac && k == 'meta') {
					k = 'ctrl';
				}
				
				//Modifiers
				if(k == 'ctrl' || k == 'control')
					mask |= MODIFIERS.CTRL;
				else if (k == 'shift')
					mask |= MODIFIERS.SHIFT;
				else if (k == 'alt')
					mask |= MODIFIERS.ALT;
				else if (k == 'meta')
					mask |= MODIFIERS.META;
				else
					key = k;
			}
			
			return {
				mask: mask,
				key: key
			};
		},
		
		/**
		 * Test shortcut combination against event
		 * @param {String} combination Keyboard shortcut
		 * @param {Event} evt
		 */
		test: function(combination, evt) {
			var mask = 0,
				ccomb = this.compile(combination);
			
			if (evt.ctrlKey)  mask |= MODIFIERS.CTRL;
			if (evt.shiftKey) mask |= MODIFIERS.SHIFT;
			if (evt.altKey)   mask |= MODIFIERS.ALT;
			if (evt.metaKey)  mask |= MODIFIERS.META;
			
			var code = evt.keyCode ? evt.keyCode : evt.which,
				character = String.fromCharCode(code).toLowerCase();
			
			// if mask doesn't match, no need to test further
			if (mask !== ccomb.mask) return false;
			
			if (ccomb.key.length > 1) { //If it is a special key
				return special_keys[ccomb.key] == code;
			} else { //The special keys did not match
				if(code == 188) character = ","; //If the user presses , when the type is onkeydown
				if(code == 190) character = ".";
				if(code == 191) character = "/";
				
				if (character == ccomb.key) return true;
				if (evt.shiftKey && shift_nums[character]) //Stupid Shift key bug created by using lowercase
					return shift_nums[character] == ccomb.key;
			}
			
			return false;
		},
		
		/**
		 * Format keystroke for better readability, considering current platform
		 * mnemonics
		 * @param {String} keystroke
		 * @return {String}
		 */
		format: function(keystroke) {
			var char_map = is_mac ? mac_char_map : pc_char_map,
				glue = is_mac ? '' : '+',
				keys = keystroke.toLowerCase().split('+'),
				ar = [],
				key;
				
			for (var i = 0; i < keys.length; i++) {
				key = keys[i];
				ar.push(key in char_map ? char_map[key] : capitalize(key));
			}
			
			return ar.join(glue);
		}
	};
});