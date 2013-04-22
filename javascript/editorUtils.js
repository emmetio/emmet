/**
 * Utility module used to prepare text for pasting into back-end editor
 * @param {Function} require
 * @param {Underscore} _
 * @author Sergey Chikuyonok (serge.che@gmail.com) <http://chikuyonok.ru>
 */
emmet.define('editorUtils', function(require, _) {
	return  {
		/**
		 * Check if cursor is placed inside XHTML tag
		 * @param {String} html Contents of the document
		 * @param {Number} caretPos Current caret position inside tag
		 * @return {Boolean}
		 */
		isInsideTag: function(html, caretPos) {
			var reTag = /^<\/?\w[\w\:\-]*.*?>/;
			
			// search left to find opening brace
			var pos = caretPos;
			while (pos > -1) {
				if (html.charAt(pos) == '<') 
					break;
				pos--;
			}
			
			if (pos != -1) {
				var m = reTag.exec(html.substring(pos));
				if (m && caretPos > pos && caretPos < pos + m[0].length)
					return true;
			}
			
			return false;
		},
		
		/**
		 * Sanitizes incoming editor data and provides default values for
		 * output-specific info
		 * @param {IEmmetEditor} editor
		 * @param {String} syntax
		 * @param {String} profile
		 */
		outputInfo: function(editor, syntax, profile) {
			// most of this code makes sense for Java/Rhino environment
			// because string that comes from Java are not actually JS string
			// but Java String object so the have to be explicitly converted
			// to native string
			profile = profile || editor.getProfileName();
			return  {
				/** @memberOf outputInfo */
				syntax: String(syntax || editor.getSyntax()),
				profile: profile || null,
				content: String(editor.getContent())
			};
		},
		
		/**
		 * Unindent content, thus preparing text for tag wrapping
		 * @param {IEmmetEditor} editor Editor instance
		 * @param {String} text
		 * @return {String}
		 */
		unindent: function(editor, text) {
			return require('utils').unindentString(text, this.getCurrentLinePadding(editor));
		},
		
		/**
		 * Returns padding of current editor's line
		 * @param {IEmmetEditor} Editor instance
		 * @return {String}
		 */
		getCurrentLinePadding: function(editor) {
			return require('utils').getLinePadding(editor.getCurrentLine());
		}
	};
});
