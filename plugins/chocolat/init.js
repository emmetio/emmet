var _ = require('./underscore');
var emmet = require('./emmet');
var editorProxy = require('./editor');

/** @type NodePathModule */
var path = require('path');

/** @type NodeFsModule */
var fs = require('fs');

var keymap = {
	'expand_abbreviation': 'ctrl-e',
	'match_pair_outward': 'ctrl-d',
	'match_pair_inward': 'shift-ctrl-d',
	'wrap_with_abbreviation': 'shift-cmd-a',
	'next_edit_point': 'ctrl-alt-right',
	'prev_edit_point': 'ctrl-alt-left',
	'merge_lines': 'cmd-shift-m',
	'toggle_comment': 'ctrl-/',
	'split_join_tag': 'cmd-\'',
	'remove_tag': 'cmd-k',
	'evaluate_math_expression': 'shift-cmd-y',
	'update_image_size': 'ctrl-i',
	'encode_decode_data_url': 'ctrl-shift-i',

	'increment_number_by_1': 'ctrl-up',
	'decrement_number_by_1': 'ctrl-down',
	'increment_number_by_01': 'alt-up',
	'decrement_number_by_01': 'alt-down',
	'increment_number_by_10': 'ctrl-pageup',
	'decrement_number_by_10': 'ctrl-pagedown',

	'select_next_item': 'ctrl-shift-right',
	'select_previous_item': 'ctrl-shift-left',
	'reflect_css_value': 'cmd-b'
};

function runAction(name) {
	var run = function() {
		var args = _.toArray(arguments) || [];
		Recipe.run(function(recipe) {
			// set indentation string
			var doc = Document.current();
			emmet.require('resources').setVariable('indentation', doc.tabString);
			editorProxy.recipe = recipe;
			
			args.unshift(editorProxy);
			return emmet.require('actions').run(name, args);
		});
	};
	
	
	if (name == 'wrap_with_abbreviation') {
//		var sheet = new Sheet(Editor.current());
		var sheet = new Window();
		var actionCallback = function() {
			var abbr = sheet.evalExpr('document.getElementById("abbr").value');
			if (abbr) {
				run(abbr);
			}
		};
		sheet.html = '<!doctype html><html style="overflow:hidden"><body><p>Enter abbreviation</p><input type="text" id="abbr" style="width:100%" /><script>var el = document.getElementById("abbr");el.addEventListener("keyup", function(e){if (e.keyCode == 13){window.sendMessage("close", [1]);}}, false);el.focus();</script></body></html>';
		sheet.frame = {x: 0, y: 0, width: 350, height: 85};
		sheet.buttons = ['OK', 'Cancel'];
		sheet.onButtonClick = function(name) {
			if (name == 'OK')
				actionCallback();
			
			sheet.close();
		};
		sheet.run();
//		sheet.onMessage = function(name) {
//			if (name == 'close') {
//				sheet.close();
//				actionCallback();
//			}
//		};
	} else {
		run();
	}
}

emmet.define('file', require('./file'));

// load core snippets
var bootstrap = emmet.require('bootstrap');
bootstrap.loadSystemSnippets(JSON.parse(fs.readFileSync(path.join(__dirname, 'snippets.json'), 'utf-8')));

// load extensions
var extensionsPath = path.resolve('~/emmet');
if (fs.existsSync(extensionsPath)) {
	var files = [];
	fs.readdirSync(extensionsPath).forEach(function(f) {
		if (f == '.' || f == '..')
			return;
		
		f = path.join(extensionsPath, f);
		var stat = fs.statSync(f);
		if (stat.isFile())
			files.push(f);
	});
	
	bootstrap.loadExtensions(files);
}

// register all actions
emmet.require('actions').getList().forEach(function(action) {
	if (action.options.hidden)
		return;
	
	var km = keymap;
	var userKeymapJSON = path.join(__dirname, 'keymap.json');
	if (fs.existsSync(userKeymapJSON)) {
		try {
			_.extend(km, JSON.parse(fs.readFileSync(userKeymapJSON)));
		} catch(e){}
	}
	
	Hooks.addMenuItem('Emmet/' + action.options.label, km[action.name] || '', function() {
		runAction(action.name);
	});
});