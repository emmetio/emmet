/**
 * @constructor
 * @memberOf __nppBootstrap
 * @param {Function} require
 * @param {Underscore} _
 */
emmet.exec(function(require, _) {
	var file = require('file');
	var coreDir = file.createPath(Editor.nppDir, 'plugins\\jN\\includes');
	
	// path to Emmet extensions and user's custom snippets 
	var extensionsDir = file.createPath(Editor.nppDir, 'plugins\\emmet-extensions');
	
	var bootstrap = require('bootstrap');
	
	// load snippets
	bootstrap.loadSystemSnippets(file.read(file.createPath(coreDir, 'snippets.json')));
	
	// get keymap
	var keymap = bootstrap.parseJSON(file.read(file.createPath(coreDir, 'keymap.json')));
	
	// load extensions
	var fso = new ActiveXObject("Scripting.FileSystemObject");
	if (fso.FolderExists(extensionsDir)) {
		var fileList = [];
		var extensionFiles = fso.GetFolder(extensionsDir).Files;
		
		var fileEnum = new Enumerator(extensionFiles);
		for (; !fileEnum.atEnd(); fileEnum.moveNext()) {
			fileList.push(fileEnum.item().Path);
		}
		
		bootstrap.loadExtensions(fileList);
	}
	
	// more info http://msdn.microsoft.com/en-us/library/dd375731%28VS.85%29.aspx
	var vkeys = {
		VK_LBUTTON: 0x01,
		VK_RBUTTON: 0x02,
		VK_CANCEL: 0x03,
		VK_MBUTTON: 0x04,
		VK_BACK: 0x08,
		VK_TAB: 0x09,
		VK_CLEAR: 0x0C,
		VK_RETURN: 0x0D,
		VK_SHIFT: 0x10,
		VK_CONTROL: 0x11,
		VK_MENU: 0x12,
		VK_PAUSE: 0x13,
		VK_CAPITAL: 0x14,
		VK_ESCAPE: 0x1B,
		VK_SPACE: 0x20,
		VK_PRIOR: 0x21,
		VK_NEXT: 0x22,
		VK_END: 0x23,
		VK_HOME: 0x24,
		VK_LEFT: 0x25,
		VK_UP: 0x26,
		VK_RIGHT: 0x27,
		VK_DOWN: 0x28,
		VK_SELECT: 0x29,
		VK_PRINT: 0x2A,
		VK_EXECUTE: 0x2B,
		VK_SNAPSHOT: 0x2C,
		VK_INSERT: 0x2D,
		VK_DELETE: 0x2E,
		VK_HELP: 0x2F,
		VK_NUMPAD0: 0x60,
		VK_NUMPAD1: 0x61,
		VK_NUMPAD2: 0x62,
		VK_NUMPAD3: 0x63,
		VK_NUMPAD4: 0x64,
		VK_NUMPAD5: 0x65,
		VK_NUMPAD6: 0x66,
		VK_NUMPAD7: 0x67,
		VK_NUMPAD8: 0x68,
		VK_NUMPAD9: 0x69,
		VK_MULTIPLY: 0x6A,
		VK_ADD: 0x6B,
		VK_SEPARATOR: 0x6C,
		VK_SUBTRACT: 0x6D,
		VK_DECIMAL: 0x6E,
		VK_DIVIDE: 0x6F,
		VK_F1: 0x70,
		VK_F2: 0x71,
		VK_F3: 0x72,
		VK_F4: 0x73,
		VK_F5: 0x74,
		VK_F6: 0x75,
		VK_F7: 0x76,
		VK_F8: 0x77,
		VK_F9: 0x78,
		VK_F10: 0x79,
		VK_F11: 0x7A,
		VK_F12: 0x7B,
		VK_F13: 0x7C,
		VK_F14: 0x7D,
		VK_F15: 0x7E,
		VK_F16: 0x7F,
		VK_F17: 0x80,
		VK_F18: 0x81,
		VK_F19: 0x82,
		VK_F20: 0x83,
		VK_F21: 0x84,
		VK_F22: 0x85,
		VK_F23: 0x86,
		VK_F24: 0x87,
		VK_NUMLOCK: 0x90,
		VK_SCROLL: 0x91
	};

	function setupHotkey(cfg, keystroke) {
		cfg = _.extend(cfg, {
			ctrl: false,
			alt: false,
			shift: false
		});
		
		_.each(keystroke.split('+'), function(key) {
			var lkey = key.toLowerCase();
			
			switch (lkey) {
				case 'shift':
				case 'alt':
				case 'ctrl':
					cfg[lkey] = true;
					break;
				default:
					if (key in vkeys) {
						cfg.key = vkeys[key];
					}
					else {
						cfg.key = lkey;
					}
			}
		});
		
		return cfg;
	}
	
	function addMenuItems(menu, items) {
		_.each(items, function(item) {
			if (item.type == 'action') {
				var cfg = {
					text: item.label,
					cmd: function() {
						return require('actions').run(item.name, require('editorProxy'));
					}
				};
				
				if (item.name in keymap) {
					System.addHotkey(setupHotkey(cfg, keymap[item.name]));
					cfg.text += '\t' + keymap[item.name];
				}
				
				menu.addItem(cfg);
				
			} else if (item.type == 'submenu') {
				var submenu = menu.addMenu(item.name);
				addMenuItems(submenu, item.items);
			}
		});
	}
	
	// create menu items
	var rootMenu = Editor.addMenu("Emmet");
	addMenuItems(rootMenu, require('actions').getMenu());
});