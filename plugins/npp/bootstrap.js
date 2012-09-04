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
		for (var i = 0, il = extensionFiles.Count; i < il; i++) {
			fileList.push(extensionFiles.Item(i).Path);
		}
		
		bootstrap.loadExtensions(fileList);
	}
	
	function setupHotkey(cfg, keystroke) {
		cfg = _.extend(cfg, {
			ctrl: false,
			alt: false,
			shift: false
		});
		
		_.each(keystroke.split('+'), function(key) {
			key = key.toLowerCase(key);
			
			switch (key) {
				case 'shift':
				case 'alt':
				case 'ctrl':
					cfg[key] = true;
					break;
				default:
					cfg.key = key;
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