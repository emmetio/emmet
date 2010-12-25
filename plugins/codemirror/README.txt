How to add Zen Coding support for CodeMirror editor:

1. Add zen_codemirror.js script into your page
2. Add two more options into CodeMirror's init script: 'syntax' and 'onLoad'. 
Like this:

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

The 'syntax' option tells which syntax is currently used in editor. Available 
values are: 'html' (default), 'xml', 'xsl', 'css', 'haml'.

You can also pass 'profile' option to specify how Zen Coding will format and 
output abbreviation. Available profiles are: 'html', 'xhtml', 'xml', but you can
create your own output profile with 
'zen_editor.getCore().setupProfile(name, options)'

See https://github.com/sergeche/zen-coding/blob/master/javascript/zen_coding.js#L21
for a list of available options

To get more info about available actions and their shortcuts you can call 'zen_editor.showInfo()' method. You can also change keyboard shortcuts for every action with 'zen_editor.shortcut(keystroke, action_name)'. See source code for a keystroke syntax and action names:
https://github.com/sergeche/zen-coding/blob/master/plugins/codemirror/zen_editor.js#L241