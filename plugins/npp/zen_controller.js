/**
 * Zen Coding manager that runs actions
 * @param {String} action_name Action to call
 * @return {Boolean} Returns 'true' if action ran successfully
 */
function zc_manager(action_name) {
	zen_editor.setContext(Editor.currentView);
	if (action_name == 'wrap_with_abbreviation') {
		var abbr = prompt('Enter Abbreviation', function(abbr){
			if (abbr)
				zen_coding.runAction(action_name, zen_editor, abbr);
		});
	} else {
		return zen_coding.runAction(action_name, zen_editor);
	}
}

function prompt(title, callback) {
	var dialog = new Dialog({
		npp: Editor,
		html: "<form><input type='text' id='prompt_str' style='width:100%' onkeydown='Config.onKeyDown(window.event);' /></form>", 
		Height: 100,
		Width: 300,
		Top: 200,
		title: title,
		js: function(){
			this.getElementById("prompt_str").focus();
		},
		onKeyDown: function(evt) {
			var target = evt.srcElement || evt.target,
				keycode = evt.keyCode || evt.which;
				
			if (keycode == 27 || keycode == 13) { 
				// escape or enter key pressed
				var value = null;
				if (keycode == 13)
					value = target.value;
					
				dialog.close();
				
				if (callback)
					callback(target.value);
			}
		}
	});
	
	dialog.show();
}

var zc_menu = Editor.addMenu("Zen Coding");

/**
 * Adds new Zen Coding menu item
 * @param {String} name Menu item name
 * @param {String} action Zen Coding action to call
 * @param {String} keystroke Keyboard shorcut for this item
 */
function addMenuItem(name, action, keystroke) {
	var menu_obj = {
		text: name + (keystroke ? '\t' + keystroke : ''),
		cmd: function() {
			zc_manager(action);
		},
		ctrl: false,
		alt: false,
		shift: false
	};
	
	if (keystroke) {
		var keys = keystroke.split('+');
		for (var i = 0, il = keys.length; i < il; i++) {
			var key = keys[i].toLowerCase();
			switch (key) {
				case 'shift':
				case 'alt':
				case 'ctrl':
					menu_obj[key] = true;
					break;
				default:
					menu_obj.key = key;
			}
		}
		
		Editor.addSystemHotKey(menu_obj);
	}
	
	zc_menu.addItem(menu_obj);
}

// init engine
addMenuItem('Expand Abbreviation', 'expand_abbreviation', 'Ctrl+E');
addMenuItem('Wrap with Abbreviation', 'wrap_with_abbreviation', 'Ctrl+Shift+A');
addMenuItem('Balance Tag', 'match_pair_outward', 'Ctrl+Shift+D');
addMenuItem('Next Edit Point', 'next_edit_point', 'Ctrl+Alt+]');
addMenuItem('Previous Edit Point', 'prev_edit_point', 'Ctrl+Alt+[');
addMenuItem('Go to Matching Pair', 'matching_pair', 'Ctrl+Alt+L');
addMenuItem('Merge Lines', 'merge_lines', 'Ctrl+Alt+M');
addMenuItem('Toggle Comment', 'toggle_comment', 'Alt+/');
addMenuItem('Split/Join Tag', 'split_join_tag', 'Ctrl+\'');
addMenuItem('Remove Tag', 'remove_tag', 'Ctrl+Shift+\'');

