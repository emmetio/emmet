/**
 * Tests if passed keydown/keypress event corresponds to defied shortcut 
 * 
 * Based on http://www.openjs.com/scripts/events/keyboard_shortcuts/
 * By Binny V A
 * License : BSD
 */
var shortcut = (function(){
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
		 * Test shortcut combination against event
		 * @param {String} combination Keyboard shortcut
		 * @param {Event} evt
		 */
		test: function(combination, evt) {
			combination = combination.toLowerCase();
			
			var code = evt.keyCode ? evt.keyCode : evt.which,
				character = String.fromCharCode(code).toLowerCase(),
				modifiers = { 
					shift: { wanted:false, pressed:false},
					ctrl : { wanted:false, pressed:false},
					alt  : { wanted:false, pressed:false},
					meta : { wanted:false, pressed:false}	//Meta is Mac specific
				},
				/**
				 * Key Pressed - counts the number of valid keypresses - if it 
				 * is same as the number of keys, the shortcut function 
				 * is invoked
				 */
				kp = 0;
			
			if(code == 188) character = ","; //If the user presses , when the type is onkeydown
			if(code == 190) character = ".";
			if(code == 191) character = "/";
			
			if(evt.ctrlKey)	modifiers.ctrl.pressed = true;
			if(evt.shiftKey)	modifiers.shift.pressed = true;
			if(evt.altKey)	modifiers.alt.pressed = true;
			if(evt.metaKey)   modifiers.meta.pressed = true;
            
			var keys = combination.split("+"), k;
			for(var i = 0, il = keys.length; i < il; i++) {
				k = keys[i];
				// Due to stupid Opera bug I have to swap Ctrl and Meta keys
				if (is_mac && is_opera) {
					if (k == 'ctrl' || k == 'control')
						k = 'meta';
					else if (k == 'meta')
						k = 'ctrl';
				} else if (!is_mac && k == 'meta') {
					k = 'ctrl';
				}
				
				//Modifiers
				if(k == 'ctrl' || k == 'control') {
					kp++;
					modifiers.ctrl.wanted = true;
				} else if (k == 'shift') {
					kp++;
					modifiers.shift.wanted = true;
				} else if (k == 'alt') {
					kp++;
					modifiers.alt.wanted = true;
				} else if (k == 'meta') {
					kp++;
					modifiers.meta.wanted = true;
				} else if (k.length > 1) { //If it is a special key
					if(special_keys[k] == code) kp++;
				} else { //The special keys did not match
					if(character == k) kp++;
					else {
						if (shift_nums[character] && evt.shiftKey) { //Stupid Shift key bug created by using lowercase
							character = shift_nums[character]; 
							if (character == k) kp++;
						}
					}
				}
			}
			
			return (kp == keys.length && 
				modifiers.ctrl.pressed == modifiers.ctrl.wanted &&
				modifiers.shift.pressed == modifiers.shift.wanted &&
				modifiers.alt.pressed == modifiers.alt.wanted &&
				modifiers.meta.pressed == modifiers.meta.wanted);
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
	}
})();