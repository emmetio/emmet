/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window */

/** Simple extension that adds a "File > Hello World" menu item */
define(function (require, exports, module) {
    "use strict";

    var CommandManager = brackets.getModule("command/CommandManager"),
        KeyBindingManager = brackets.getModule("command/KeyBindingManager"),
        Menus = brackets.getModule("command/Menus"),
        EditorManager = brackets.getModule("editor/EditorManager"),

        emmet = require("emmet"),
        editorProxy = require("editor");

    var keymap = {
        "expand_abbreviation": "Ctrl-Enter",
        "expand_abbreviation_with_tab": "Tab",
        "match_pair_outward": "Ctrl-D",
        "match_pair_inward": "Shift-Ctrl-D",
        "wrap_with_abbreviation": "Shift-Ctrl-A",
        "next_edit_point": "Ctrl-Alt-Right",
        "prev_edit_point": "Ctrl-Alt-Left",
        "select_line": "Ctrl-L",
        "merge_lines": "Ctrl-Shift-M",
        "toggle_comment": "Ctrl-\\",
        "split_join_tag": "Ctrl-J",
        "remove_tag": "Ctrl-K",
        "evaluate_math_expression": "Shift-Ctrl-Y",

        "increment_number_by_1": "Ctrl-Up",
        "decrement_number_by_1": "Ctrl-Down",
        "increment_number_by_01": "Alt-Up",
        "decrement_number_by_01": "Alt-Down",
        "increment_number_by_10": "Ctrl-Alt-Up",
        "decrement_number_by_10": "Ctrl-Alt-Down",

        "select_next_item": "Ctrl-.",
        "select_previous_item": "Ctrl-,",
        "reflect_css_value": "Ctrl-B",
        
        "insert_formatted_line_break": "Enter"
    };

    // register all commands
    var menu = Menus.addMenu("Emmet", "io.emmet.EmmetMainMenu");
    emmet.__r("actions").getList().forEach(function (action) {
        var id = "io.emmet." + action.name;
        CommandManager.register(action.options.label, id, function () {
            var editor = EditorManager.getCurrentFullEditor();
            editorProxy.setupContext(EditorManager.getCurrentFullEditor()._codeMirror);
            var df = new $.Deferred();
            if (emmet.__r("actions").run(action.name, editorProxy)) {
                df.resolve();
            } else {
                df.reject();
            }

            return df.promise();
        });

        var shortcut = keymap[action.name];
        if (! action.options.hidden) {
            menu.addMenuItem(id, shortcut);
        } else if (shortcut) {
            KeyBindingManager.addBinding(id, shortcut);
        }
    });
});