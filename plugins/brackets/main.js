emmet.exec(function(r, _) {
	var CommandManager = brackets.getModule("command/CommandManager"),
		KeyBindingManager = brackets.getModule("command/KeyBindingManager"),
		Menus = brackets.getModule("command/Menus"),
		EditorManager = brackets.getModule("editor/EditorManager"),

		editorProxy = r("brackets-editor"),
		skippedActions = ['update_image_size', 'encode_decode_data_url'];

	function runAction(action) {
		var df = new $.Deferred();

		var editor = EditorManager.getFocusedEditor();
		if (editor) {
			editorProxy.setupContext(editor._codeMirror, editor.document.file.fullPath);
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
