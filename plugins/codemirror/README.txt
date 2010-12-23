How to add Zen Coding support for CodeMirror editor:

1. Add zen_codemirror.js script into your page
2. Add two more options into CodeMirror's init script: 'syntax' and 'onLoad'. Like this:

CodeMirror.fromTextArea('code', {
	height: "350px",
	parserfile: "parsexml.js",
	stylesheet: "css/xmlcolors.css",
	path: "js/",
	continuousScanning: 500,
	lineNumbers: true,
	
	// add Zen Coding support
	syntax: 'html',
	onLoad: function(editor) {
		zen_editor.bind(editor);
	}
});

The 'syntax' option tells which syntax is currently used in editor. Available values are: 'html' (default), 'xml', 'xsl', 'css', 'haml'.

To get more info about available actions and their shortcuts you can call 'zen_editor.showInfo()' method. You can also change keyboard shortcuts for every action with 'zen_editor.shortcut(keystroke, action_name)'. See source code for a keystroke syntax and action names:
https://github.com/sergeche/zen-coding/blob/master/plugins/codemirror/zen_editor.js#L241