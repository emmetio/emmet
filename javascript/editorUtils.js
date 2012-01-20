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
		 * Process text that should be pasted into editor: clear escaped text and
		 * handle tabstops
		 * @param {String} text
		 * @param {Function} escapeFn Handle escaped character. Must return
		 * replaced value
		 * @param {Function} tabstopFn Callback function that will be called on every
		 * tabstob occurrence, passing <b>index</b>, <code>number</code> and 
		 * <b>value</b> (if exists) arguments. This function must return 
		 * replacement value
		 * @return {String} 
		 */
		processTextBeforePaste: function(text, escapeFn, tabstopFn) {
			var i = 0, il = text.length, startIx, _i;
			var strBuilder = [];
				
			var nextWhile = function(ix, fn) {
				while (ix < il) if (!fn(text.charAt(ix++))) break;
				return ix - 1;
			};
			
			var utils = require('utils');
			
			while (i < il) {
				var ch = text.charAt(i);
				if (ch == '\\' && i + 1 < il) {
					// handle escaped character
					strBuilder.push(escapeFn(text.charAt(i + 1)));
					i += 2;
					continue;
				} else if (ch == '$') {
					// looks like a tabstop
					var next_ch = text.charAt(i + 1) || '';
					_i = i;
					if (utils.isNumeric(next_ch)) {
						// $N placeholder
						startIx = i + 1;
						i = nextWhile(startIx, utils.isNumeric);
						if (startIx < i) {
							strBuilder.push(tabstopFn(_i, text.substring(startIx, i)));
							continue;
						}
					} else if (next_ch == '{') {
						// ${N:value} or ${N} placeholder
						var braceCount = 1;
						startIx = i + 2;
						i = nextWhile(startIx, utils.isNumeric);
						
						if (i > startIx) {
							if (text.charAt(i) == '}') {
								strBuilder.push(tabstopFn(_i, text.substring(startIx, i)));
								i++; // handle closing brace
								continue;
							} else if (text.charAt(i) == ':') {
								var valStart = i + 2;
								i = nextWhile(valStart, function(c) {
									if (c == '{') braceCount++;
									else if (c == '}') braceCount--;
									return !!braceCount;
								});
								strBuilder.push(tabstopFn(_i, text.substring(startIx, valStart - 2), text.substring(valStart - 1, i)));
								i++; // handle closing brace
								continue;
							}
						}
					}
					i = _i;
				}
				
				// push current character to stack
				strBuilder.push(ch);
				i++;
			}
			
			return strBuilder.join('');
		},
		
		/**
		 * Upgrades tabstops in zen node in order to prevent naming conflicts
		 * @param {ZenNode} node
		 * @param {Number} offset Tab index offset
		 * @returns {Number} Maximum tabstop index in element
		 */
		upgradeTabstops: function(node, offset) {
			var maxNum = 0;
			var escapeFn = function(ch){ return '\\' + ch; };
			var tabstopFn = function(i, num, value) {
				num = parseInt(num);
				if (num > maxNum) maxNum = num;
					
				if (value)
					return '${' + (num + offset) + ':' + value + '}';
				else
					return '$' + (num + offset);
			};
			
			_.each(['start', 'end', 'content'], function(p) {
				node[p] = this.processTextBeforePaste(node[p], escapeFn, tabstopFn);
			}, this);
			
			return maxNum;
		},
		
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
		}
	};
});
