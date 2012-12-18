*This plugin is automatically compiled from the [Emmet core](https://github.com/emmetio/emmet). If you want to contribute features or fix bugs, please do this in [plugin source](https://github.com/emmetio/emmet/tree/master/plugins/codemirror2).*

******

To add Emmet support for CodeMirror2/3 editor, simply add `emmet.js` as a `<script>` tag into your HTML page right after CodeMirror script.

Additionally, you can pass `profile` option into your into CodeMirror's init script to change Emmet’s HTML output style: 

```js
CodeMirror.fromTextArea(document.getElementById("code"), {
	mode : 'text/html',
	
	// define Emmet output profile
	profile: 'xhtml'
});
```

Available profiles are: _html_, _xhtml_, _xml_, but you can create your own output profile with 
`emmet.require('profile').create(name, options)`.

See [profile.js](https://github.com/emmetio/emmet/blob/master/javascript/profile.js#L10)
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

### Overriding keybindings

To override default keybindings, simply create global `emmetKeymap` object, the same as [default one](https://github.com/emmetio/emmet/blob/master/plugins/codemirror2/editor.js#L9) but with your own keybindings.