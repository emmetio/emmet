emmet.exec(function(r, _) {
	var CommandManager = brackets.getModule("command/CommandManager"),
		KeyBindingManager = brackets.getModule("command/KeyBindingManager"),
		Menus = brackets.getModule("command/Menus"),
		EditorManager = brackets.getModule("editor/EditorManager"),

		editorProxy = r("brackets-editor"),
		skippedActions = ['update_image_size', 'encode_decode_data_url'];


	 /**
	  * The following function included from Brackets to handle Tab key
	  * when abbreviation cannot be expanded (https://github.com/adobe/brackets/blob/master/LICENSE).
	  * @private
	  * Handle Tab key press.
	  * @param {!CodeMirror} instance CodeMirror instance.
	  */
	function _handleTabKey(instance) {
		// Tab key handling is done as follows:
		// 1. If the selection is before any text and the indentation is to the left of
		//    the proper indentation then indent it to the proper place. Otherwise,
		//    add another tab. In either case, move the insertion point to the
		//    beginning of the text.
		// 2. If the selection is after the first non-space character, and is not an
		//    insertion point, indent the entire line(s).
		// 3. If the selection is after the first non-space character, and is an
		//    insertion point, insert a tab character or the appropriate number
		//    of spaces to pad to the nearest tab boundary.
		var from = instance.getCursor(true),
			to = instance.getCursor(false),
			line = instance.getLine(from.line),
			indentAuto = false,
			insertTab = false;

		if (from.line === to.line) {
			if (line.search(/\S/) > to.ch || to.ch === 0) {
				indentAuto = true;
			}
		}

		if (indentAuto) {
			var currentLength = line.length;
			CodeMirror.commands.indentAuto(instance);
			// If the amount of whitespace didn't change, insert another tab
			if (instance.getLine(from.line).length === currentLength) {
					insertTab = true;
					to.ch = 0;
			}
		} else if (instance.somethingSelected()) {
			CodeMirror.commands.indentMore(instance);
		} else {
			insertTab = true;
		}

		if (insertTab) {
			if (instance.getOption("indentWithTabs")) {
					CodeMirror.commands.insertTab(instance);
			} else {
				var i, ins = "", numSpaces = _indentUnit;
				numSpaces -= to.ch % numSpaces;
				for (i = 0; i < numSpaces; i++) {
					ins += " ";
				}
				instance.replaceSelection(ins, "end");
			}
		}
	}

	function runAction(action) {
		var df = new $.Deferred();

		var editor = EditorManager.getFocusedEditor();
		if (editor) {
			editorProxy.setupContext(editor._codeMirror, editor.document.file.fullPath);
			if (action.name == 'expand_abbreviation_with_tab' && editorProxy.getSelection()) {
				var extraKeys = editor._codeMirror.getOption('extraKeys');
				if (extraKeys && extraKeys.Tab) {
					extraKeys.Tab(editor._codeMirror);
				} else {
					_handleTabKey(editor._codeMirror);
				}
				
				return df.resolve().promise();
			}
		}

		if (editor && r("actions").run(action.name, editorProxy)) {
			df.resolve();
		} else {
			df.reject();
		}

		return df.promise();
	}

	require(["text!keymap.json", "text!snippets.json"], function(keymap, snippets) {
		// load default snippets
		r('resources').setVocabulary(JSON.parse(snippets), 'system');

		// register all commands
		var menu = Menus.addMenu("Emmet", "io.emmet.EmmetMainMenu");
		keymap = JSON.parse(keymap);

		r("actions").getList().forEach(function(action) {
			if (_.include(skippedActions, action.name))
				return;

			var id = "io.emmet." + action.name;
			var shortcut = keymap[action.name];

			CommandManager.register(action.options.label, id, function () {
				runAction(action);
			});

			if (!action.options.hidden) {
				menu.addMenuItem(id, shortcut);
			} else if (shortcut) {
				KeyBindingManager.addBinding(id, shortcut);
			}
		});
	});
});
