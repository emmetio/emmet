/**
 * Utility module used to prepare text for pasting into back-end editor
 * @param {Function} require
 * @param {Underscore} _
 * @author Sergey Chikuyonok (serge.che@gmail.com) <http://chikuyonok.ru>
 */
zen_coding.define('editorUtils', function(require, _) {
	return  {
		/**
		 * Returns context-aware node counter
		 * @param {node} ZenNode
		 * @return {Number}
		 * @memberOf zen_coding.editorUtils
		 */
		getCounterForNode: function(node) {
			// find nearest repeating parent
			var counter = node.counter;
			if (!node.is_repeating && !node.repeat_by_lines) {
				while (node = node.parent) {
					if (node.is_repeating || node.repeat_by_lines)
						return node.counter;
				}
			}
			
			return counter;
		},
		
		/**
		 * Check if cursor is placed inside XHTML tag
		 * @param {String} html Contents of the document
		 * @param {Number} caretPos Current caret position inside tag
		 * @return {Boolean}
		 * TODO refactor: move to 'html_matcher' package
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
		 * @param {IZenEditor} editor
		 * @param {String} syntax
		 * @param {String} profile
		 */
		outputInfo: function(editor, syntax, profile) {
			return  {
				/** @memberOf outputInfo */
				syntax: String(syntax || editor.getSyntax()),
				profile: String(profile || editor.getProfileName()),
				content: String(editor.getContent())
			};
		},
		
		/**
		 * Unindent content, thus preparing text for tag wrapping
		 * @param {IZenEditor} editor Editor instance
		 * @param {String} text
		 * @return {String}
		 */
		unindent: function(editor, text) {
			return require('utils').unindentString(text, require('editorUtils').getCurrentLinePadding(editor));
		},
		
		/**
		 * Returns padding of current editor's line
		 * @param {IZenEditor} Editor instance
		 * @return {String}
		 */
		getCurrentLinePadding: function(editor) {
			return require('utils').getLinePadding(editor.getCurrentLine());
		},
		
		/**
		 * Narrow down text indexes, adjusting selection to non-space characters
		 * @param {String} text
		 * @param {Number} start
		 * @param {Number} end
		 * @return {Array}
		 * TODO refactor: use Range, move to utils module
		 */
		narrowToNonSpace: function(text, start, end) {
			// narrow down selection until first non-space character
			var reSpace = /\s|\n|\r/;
			var isSpace = function(ch) {
				return reSpace.test(ch);
			};
			
			while (start < end) {
				if (!isSpace(text.charAt(start)))
					break;
					
				start++;
			}
			
			while (end > start) {
				end--;
				if (!isSpace(text.charAt(end))) {
					end++;
					break;
				}
			}
			
			return [start, end];
		},
		
		/**
		 * Find start and end index of text line for <code>from</code> index
		 * @param {String} text 
		 * @param {Number} from
		 * TODO refactor: use Range, move to utils module 
		 */
		findNewlineBounds: function(text, from) {
			var len = text.length,
				start = 0,
				end = len - 1;
			
			// search left
			for (var i = from - 1; i > 0; i--) {
				var ch = text.charAt(i);
				if (ch == '\n' || ch == '\r') {
					start = i + 1;
					break;
				}
			}
			// search right
			for (var j = from; j < len; j++) {
				var ch = text.charAt(j);
				if (ch == '\n' || ch == '\r') {
					end = j;
					break;
				}
			}
			
			return {start: start, end: end};
		}
	};
});
