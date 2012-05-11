/**
 * High-level editor interface that communicates with underlying editor (like 
 * TinyMCE, CKEditor, etc.) or browser.
 * Basically, you should call <code>zen_editor.setContext(obj)</code> method to
 * set up undelying editor context before using any other method.
 * 
 * This interface is used by <i>zen_actions.js</i> for performing different 
 * actions like <b>Expand abbreviation</b>  
 * @type IZenEditor
 * @constructor
 * @example
 * var textarea = document.getElemenetsByTagName('textarea')[0];
 * zen_editor.setContext(textarea);
 * //now you are ready to use editor object
 * zen_editor.getSelectionRange();
 * 
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */
function IZenEditor() {}

IZenEditor.prototype = {
	/**
	 * Setup underlying editor context. You should call this method 
	 * <code>before</code> using any Zen Coding action.
	 * @memberOf IZenEditor
	 * @param {Object} context
	 */
	setContext: function(context) {},
	
	/**
	 * Returns character indexes of selected text: object with <code>start</code>
	 * and <code>end</code> properties. If there's no selection, should return 
	 * object with <code>start</code> and <code>end</code> properties referring
	 * to current caret position
	 * @return {Object}
	 * @example
	 * var selection = zen_editor.getSelectionRange();
	 * alert(selection.start + ', ' + selection.end); 
	 */
	getSelectionRange: function() {
		return {
			start: 0,
			end: 0
		};
	},
	
	/**
	 * Creates selection from <code>start</code> to <code>end</code> character
	 * indexes. If <code>end</code> is ommited, this method should place caret 
	 * and <code>start</code> index
	 * @param {Number} start
	 * @param {Number} [end]
	 * @example
	 * zen_editor.createSelection(10, 40);
	 * 
	 * //move caret to 15th character
	 * zen_editor.createSelection(15);
	 */
	createSelection: function(start, end) {},
	
	/**
	 * Returns current line's start and end indexes as object with <code>start</code>
	 * and <code>end</code> properties
	 * @return {Object}
	 * @example
	 * var range = zen_editor.getCurrentLineRange();
	 * alert(range.start + ', ' + range.end);
	 */
	getCurrentLineRange: function() {
		return {
			start: 0, 
			end: 0
		};
	},
	
	/**
	 * Returns current caret position
	 * @return {Number|null}
	 */
	getCaretPos: function(){},
	
	/**
	 * Set new caret position
	 * @param {Number} pos Caret position
	 */
	setCaretPos: function(pos){},
	
	/**
	 * Returns content of current line
	 * @return {String}
	 */
	getCurrentLine: function() {},
	
	/**
	 * Replace editor's content or it's part (from <code>start</code> to 
	 * <code>end</code> index). If <code>value</code> contains 
	 * <code>caret_placeholder</code>, the editor will put caret into 
	 * this position. If you skip <code>start</code> and <code>end</code>
	 * arguments, the whole target's content will be replaced with 
	 * <code>value</code>. 
	 * 
	 * If you pass <code>start</code> argument only,
	 * the <code>value</code> will be placed at <code>start</code> string 
	 * index of current content. 
	 * 
	 * If you pass <code>start</code> and <code>end</code> arguments,
	 * the corresponding substring of current target's content will be 
	 * replaced with <code>value</code>. 
	 * @param {String} value Content you want to paste
	 * @param {Number} [start] Start index of editor's content
	 * @param {Number} [end] End index of editor's content
	 * @param {Boolean} [no_indent] Do not auto indent <code>value</code>
	 */
	replaceContent: function(value, start, end, no_indent) {},
	
	/**
	 * Returns editor's content
	 * @return {String}
	 */
	getContent: function(){},
	
	/**
	 * Returns current editor's syntax mode
	 * @return {String}
	 */
	getSyntax: function(){
		return 'html';
	},
	
	/**
	 * Returns current output profile name (@see zen_coding#setupProfile)
	 * @return {String}
	 */
	getProfileName: function() {
		return 'xhtml';
	},
	
	/**
	 * Ask user to enter something
	 * @param {String} title Dialog title
	 * @return {String} Entered data
	 * @since 0.65
	 */
	prompt: function(title) {
		return '';
	},
	
	/**
	 * Returns current selection
	 * @return {String}
	 * @since 0.65
	 */
	getSelection: function() {
		return '';
	},
	
	/**
	 * Returns current editor's file path
	 * @return {String}
	 * @since 0.65 
	 */
	getFilePath: function() {
		return '';
	}
};