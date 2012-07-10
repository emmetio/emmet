To add Zen Coding support for CodeMirror2 editor, simply add `zencoding.js` as a `<script>` tag into your HTML page right after CodeMirror script.

Additionally, you can pass `profile` option into your into CodeMirror's init script to change Zen Coding’s HTML output style: 

	CodeMirror.fromTextArea(document.getElementById("code"), {
		mode : 'text/html',
		profile: 'xhtml' /* define Zen Coding output profile */
	});

Available profiles are: _html_, _xhtml_, _xml_, but you can create your own output profile with 
`zen_coding.require('profile').create(name, options)`.

See https://github.com/sergeche/zen-coding/blob/v0.7.1/javascript/profile.js#L10
for a list of available options.

### Default keybindings
* `Cmd-E` or `Tab`: Expand abbreviation
* `Cmd-D`: Balance Tag (matches opening and closing tag pair)
* `Shift-Cmd-D`: Balance Tag Inward
* `Shift-Cmd-A`: Wrap With Abbreviation
* `Ctrl-Alt-Right`: Next Edit Point
* `Ctrl-Alt-Left`: Previous Edit Point
* `Cmd-L`: Select line
* `Cmd-Shift-M`: Merge Lines
* `Cmd-/`: Toggle Comment
* `Cmd-J`: Split/Join Tag
* `Cmd-K`: Remove Tag
* `Shift-Cmd-Y`: Evaluate Math Expression
* `Ctrl-Up`: Increment Number by 1
* `Ctrl-Down`: Decrement Number by 1
* `Alt-Up`: Increment Number by 0.1
* `Alt-Down`: Decrement Number by 0.1
* `Ctrl-Alt-Up`: Increment Number by 10
* `Ctrl-Alt-Down`: Decrement Number by 10
* `Cmd-.`: Select Next Item
* `Cmd-,`: Select Previous Item
* `Cmd-B`: Reflect CSS Value