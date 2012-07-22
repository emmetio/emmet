/**
 * @constructor
 * @memberOf __nppBootstrap
 * @param {Function} require
 * @param {Underscore} _
 */
zen_coding.exec(function(require, _) {
	var file = zen_coding.require('file');
	var coreDir = file.createPath(Editor.nppDir, 'plugins\\jN\\includes');
	
	// path to Zen Coding extensions and user's custom snippets
	var extensionsDir = file.createPath(Editor.nppDir, 'plugins\\zencoding-extensions');
	
	function toJSON(data) {
		// do non-strict parsing of JSON data
		try {
			return (new Function('return ' + data))();
		} catch(e) {
			return {};
		}
	}
	
	// load snippets
	var snippets = toJSON(file.read(file.createPath(coreDir, 'snippets.json')));
	require('resources').setVocabulary(snippets, 'system');
	
	// get keymap
	var keymap = toJSON(file.read(file.createPath(coreDir, 'keymap.json')));
	
	// load extensions
	var fso = new ActiveXObject("Scripting.FileSystemObject");
	if (fso.FolderExists(extensionsDir)) {
		var extensionFiles = fso.GetFolder(extensionsDir).Files;
		var extFile;
		for (var i = 0, il = extensionFiles.Count; i < il; i++) {
			extFile = extensionFiles.Item(i);
			if (file.getExt(extFile.Name) == 'js') {
				addScript(file.read(extFile.Path));
			} else if (extFile.Name.toLowerCase() == 'snippets.json') {
				require('resources').setVocabulary(toJSON(file.read(extFile.Path)), 'user');
			} else if (extFile.Name.toLowerCase() == 'preferences.json') {
				require('preferences').load(toJSON(file.read(extFile.Path)));
			}
		}
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
	var rootMenu = Editor.addMenu("Zen Coding");
	addMenuItems(rootMenu, require('actions').getMenu());
});