/**
 * Utility module for Emmet
 * @param {Function} require
 * @param {Underscore} _
 */
emmet.define('utils', function(require, _) {
	/** 
	 * Special token used as a placeholder for caret positions inside 
	 * generated output 
	 */
	var caretPlaceholder = '${0}';
	
	return {
		/** @memberOf utils */
		reTag: /<\/?[\w:\-]+(?:\s+[\w\-:]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*\s*(\/?)>$/,
		
		/**
		 * Test if passed string ends with XHTML tag. This method is used for testing
		 * '>' character: it belongs to tag or it's a part of abbreviation? 
		 * @param {String} str
		 * @return {Boolean}
		 */
		endsWithTag: function(str) {
			return this.reTag.test(str);
		},
		
		/**
		 * Check if passed symbol is a number
		 * @param {String} ch
		 * @returns {Boolean}
		 */
		isNumeric: function(ch) {
			if (typeof(ch) == 'string')
				ch = ch.charCodeAt(0);
				
			return (ch && ch > 47 && ch < 58);
		},
		
		/**
		 * Trim whitespace from string
		 * @param {String} text
		 * @return {String}
		 */
		trim: function(text) {
			return (text || "").replace(/^\s+|\s+$/g, "");
		},
		
		/**
		 * Returns newline character
		 * @returns {String}
		 */
		getNewline: function() {
			var res = require('resources');
			if (!res) {
				return '\n';
			}
			
			var nl = res.getVariable('newline');
			return _.isString(nl) ? nl : '\n';
		},
		
		/**
		 * Sets new newline character that will be used in output
		 * @param {String} str
		 */
		setNewline: function(str) {
			var res = require('resources');
			res.setVariable('newline', str);
			res.setVariable('nl', str);
		},
		
		/**
		 * Split text into lines. Set <code>remove_empty</code> to true to filter
		 * empty lines
		 * @param {String} text Text to split
		 * @param {Boolean} removeEmpty Remove empty lines from result
		 * @return {Array}
		 */
		splitByLines: function(text, removeEmpty) {
			// IE fails to split string by regexp, 
			// need to normalize newlines first
			// Also, Mozilla's Rhiho JS engine has a weird newline bug
			var nl = this.getNewline();
			var lines = (text || '')
				.replace(/\r\n/g, '\n')
				.replace(/\n\r/g, '\n')
				.replace(/\r/g, '\n')
				.replace(/\n/g, nl)
				.split(nl);
			
			if (removeEmpty) {
				lines = _.filter(lines, function(line) {
					return line.length && !!this.trim(line);
				}, this);
			}
			
			return lines;
		},
		
		/**
		 * Normalizes newline character: replaces newlines in <code>text</code> 
		 * with newline defined in preferences
		 * @param {String} text
		 * @returns {String}
		 */
		normalizeNewline: function(text) {
			return this.splitByLines(text).join(this.getNewline());
		},
		
		/**
		 * Repeats string <code>howMany</code> times
		 * @param {String} str
		 * @param {Number} how_many
		 * @return {String}
		 */
		repeatString: function(str, howMany) {
			var result = [];
			
			for (var i = 0; i < howMany; i++) 
				result.push(str);
				
			return result.join('');
		},
		
		/**
		 * Returns list of paddings that should be used to align passed string
		 * @param {Array} strings
		 * @returns {Array}
		 */
		getStringsPads: function(strings) {
			var lengths = _.map(strings, function(s) {
				return _.isString(s) ? s.length : +s;
			});
			
			var max = _.max(lengths);
			return _.map(lengths, function(l) {
				var pad = max - l;
				return pad ? this.repeatString(' ', pad) : '';
			}, this);
		},
		
		/**
		 * Indents text with padding
		 * @param {String} text Text to indent
		 * @param {String} pad Padding size (number) or padding itself (string)
		 * @return {String}
		 */
		padString: function(text, pad) {
			var padStr = (_.isNumber(pad)) 
				? this.repeatString(require('resources').getVariable('indentation') || '\t', pad) 
				: pad;
				
			var result = [];
			
			var lines = this.splitByLines(text);
			var nl = this.getNewline();
				
			result.push(lines[0]);
			for (var j = 1; j < lines.length; j++) 
				result.push(nl + padStr + lines[j]);
				
			return result.join('');
		},
		
		/**
		 * Pad string with zeroes
		 * @param {String} str String to pad
		 * @param {Number} pad Desired string length
		 * @return {String}
		 */
		zeroPadString: function(str, pad) {
			var padding = '';
			var il = str.length;
				
			while (pad > il++) padding += '0';
			return padding + str; 
		},
		
		/**
		 * Removes padding at the beginning of each text's line
		 * @param {String} text
		 * @param {String} pad
		 */
		unindentString: function(text, pad) {
			var lines = this.splitByLines(text);
			for (var i = 0; i < lines.length; i++) {
				if (lines[i].search(pad) === 0)
					lines[i] = lines[i].substr(pad.length);
			}
			
			return lines.join(this.getNewline());
		},
		
		/**
		 * Replaces unescaped symbols in <code>str</code>. For example, the '$' symbol
		 * will be replaced in 'item$count', but not in 'item\$count'.
		 * @param {String} str Original string
		 * @param {String} symbol Symbol to replace
		 * @param {String} replace Symbol replacement. Might be a function that 
		 * returns new value
		 * @return {String}
		 */
		replaceUnescapedSymbol: function(str, symbol, replace) {
			var i = 0;
			var il = str.length;
			var sl = symbol.length;
			var matchCount = 0;
				
			while (i < il) {
				if (str.charAt(i) == '\\') {
					// escaped symbol, skip next character
					i += sl + 1;
				} else if (str.substr(i, sl) == symbol) {
					// have match
					var curSl = sl;
					matchCount++;
					var newValue = replace;
					if (_.isFunction(replace)) {
						var replaceData = replace(str, symbol, i, matchCount);
						if (replaceData) {
							curSl = replaceData[0].length;
							newValue = replaceData[1];
						} else {
							newValue = false;
						}
					}
					
					if (newValue === false) { // skip replacement
						i++;
						continue;
					}
					
					str = str.substring(0, i) + newValue + str.substring(i + curSl);
					// adjust indexes
					il = str.length;
					i += newValue.length;
				} else {
					i++;
				}
			}
			
			return str;
		},
		
		/**
		 * Replace variables like ${var} in string
		 * @param {String} str
		 * @param {Object} vars Variable set (defaults to variables defined in 
		 * <code>snippets.json</code>) or variable resolver (<code>Function</code>)
		 * @return {String}
		 */
		replaceVariables: function(str, vars) {
			vars = vars || {};
			var resolver = _.isFunction(vars) ? vars : function(str, p1) {
				return p1 in vars ? vars[p1] : null;
			};
			
			var res = require('resources');
			return require('tabStops').processText(str, {
				variable: function(data) {
					var newValue = resolver(data.token, data.name, data);
					if (newValue === null) {
						// try to find variable in resources
						newValue = res.getVariable(data.name);
					}
					
					if (newValue === null || _.isUndefined(newValue))
						// nothing found, return token itself
						newValue = data.token;
					return newValue;
				}
			});
		},
		
		/**
		 * Replaces '$' character in string assuming it might be escaped with '\'
		 * @param {String} str String where character should be replaced
		 * @param {String} value New value
		 * @return {String}
		 */
		replaceCounter: function(str, value, total) {
			var symbol = '$';
			// in case we received strings from Java, convert the to native strings
			str = String(str);
			value = String(value);
			
			if (/^\-?\d+$/.test(value)) {
				value = +value;
			}
			
			var that = this;
			
			return this.replaceUnescapedSymbol(str, symbol, function(str, symbol, pos, matchNum){
				if (str.charAt(pos + 1) == '{' || that.isNumeric(str.charAt(pos + 1)) ) {
					// it's a variable, skip it
					return false;
				}
				
				// replace sequense of $ symbols with padded number  
				var j = pos + 1;
				while(str.charAt(j) == '$' && str.charAt(j + 1) != '{') j++;
				var pad = j - pos;
				
				// get counter base
				var base = 0, decrement = false, m;
				if ((m = str.substr(j).match(/^@(\-?)(\d*)/))) {
					j += m[0].length;
					
					if (m[1]) {
						decrement = true;
					}
					
					base = parseInt(m[2] || 1, 10) - 1;
				}
				
				if (decrement && total && _.isNumber(value)) {
					value = total - value + 1;
				}
				
				value += base;
				
				return [str.substring(pos, j), that.zeroPadString(value + '', pad)];
			});
		},
		
		/**
		 * Check if string matches against <code>reTag</code> regexp. This 
		 * function may be used to test if provided string contains HTML tags
		 * @param {String} str
		 * @returns {Boolean}
		 */
		matchesTag: function(str) {
			return this.reTag.test(str || '');
		},
		
		/**
		 * Escapes special characters used in Emmet, like '$', '|', etc.
		 * Use this method before passing to actions like "Wrap with Abbreviation"
		 * to make sure that existing special characters won't be altered
		 * @param {String} text
		 * @return {String}
		 */
		escapeText: function(text) {
			return text.replace(/([\$\\])/g, '\\$1');
		},
		
		/**
		 * Unescapes special characters used in Emmet, like '$', '|', etc.
		 * @param {String} text
		 * @return {String}
		 */
		unescapeText: function(text) {
			return text.replace(/\\(.)/g, '$1');
		},
		
		/**
		 * Returns caret placeholder
		 * @returns {String}
		 */
		getCaretPlaceholder: function() {
			return _.isFunction(caretPlaceholder) 
				? caretPlaceholder.apply(this, arguments)
				: caretPlaceholder;
		},
		
		/**
		 * Sets new representation for carets in generated output
		 * @param {String} value New caret placeholder. Might be a 
		 * <code>Function</code>
		 */
		setCaretPlaceholder: function(value) {
			caretPlaceholder = value;
		},
		
		/**
		 * Returns line padding
		 * @param {String} line
		 * @return {String}
		 */
		getLinePadding: function(line) {
			return (line.match(/^(\s+)/) || [''])[0];
		},
		
		/**
		 * Helper function that returns padding of line of <code>pos</code>
		 * position in <code>content</code>
		 * @param {String} content
		 * @param {Number} pos
		 * @returns {String}
		 */
		getLinePaddingFromPosition: function(content, pos) {
			var lineRange = this.findNewlineBounds(content, pos);
			return this.getLinePadding(lineRange.substring(content));
		},
		
		/**
		 * Escape special regexp chars in string, making it usable for creating dynamic
		 * regular expressions
		 * @param {String} str
		 * @return {String}
		 */
		escapeForRegexp: function(str) {
			var specials = new RegExp("[.*+?|()\\[\\]{}\\\\]", "g"); // .*+?|()[]{}\
			return str.replace(specials, "\\$&");
		},
		
		/**
		 * Make decimal number look good: convert it to fixed precision end remove
		 * traling zeroes 
		 * @param {Number} num
		 * @param {Number} fracion Fraction numbers (default is 2)
		 * @return {String}
		 */
		prettifyNumber: function(num, fraction) {
			return num.toFixed(typeof fraction == 'undefined' ? 2 : fraction).replace(/\.?0+$/, '');
		},
		
		/**
		 * Replace substring of <code>str</code> with <code>value</code>
		 * @param {String} str String where to replace substring
		 * @param {String} value New substring value
		 * @param {Number} start Start index of substring to replace. May also
		 * be a <code>Range</code> object: in this case, the <code>end</code>
		 * argument is not required
		 * @param {Number} end End index of substring to replace. If ommited, 
		 * <code>start</code> argument is used
		 */
		replaceSubstring: function(str, value, start, end) {
			if (_.isObject(start) && 'end' in start) {
				end = start.end;
				start = start.start;
			}
			
			if (_.isString(end))
				end = start + end.length;
			
			if (_.isUndefined(end))
				end = start;
			
			if (start < 0 || start > str.length)
				return str;
			
			return str.substring(0, start) + value + str.substring(end);
		},
		
		/**
		 * Narrows down text range, adjusting selection to non-space characters
		 * @param {String} text
		 * @param {Number} start Starting range in <code>text</code> where 
		 * slection should be adjusted. Can also be any object that is accepted
		 * by <code>Range</code> class
		 * @return {Range}
		 */
		narrowToNonSpace: function(text, start, end) {
			var range = require('range').create(start, end);
			
			var reSpace = /[\s\n\r\u00a0]/;
			// narrow down selection until first non-space character
			while (range.start < range.end) {
				if (!reSpace.test(text.charAt(range.start)))
					break;
					
				range.start++;
			}
			
			while (range.end > range.start) {
				range.end--;
				if (!reSpace.test(text.charAt(range.end))) {
					range.end++;
					break;
				}
			}
			
			return range;
		},
		
		/**
		 * Find start and end index of text line for <code>from</code> index
		 * @param {String} text 
		 * @param {Number} from
		 */
		findNewlineBounds: function(text, from) {
			var len = text.length,
				start = 0,
				end = len - 1, 
				ch;

			
			// search left
			for (var i = from - 1; i > 0; i--) {
				ch = text.charAt(i);
				if (ch == '\n' || ch == '\r') {
					start = i + 1;
					break;
				}
			}
			// search right
			for (var j = from; j < len; j++) {
				ch = text.charAt(j);
				if (ch == '\n' || ch == '\r') {
					end = j;
					break;
				}
			}
			
			return require('range').create(start, end - start);
		},

		/**
		 * Deep merge of two or more objects. Taken from jQuery.extend()
		 */
		deepMerge: function() {
			var options, name, src, copy, copyIsArray, clone,
				target = arguments[0] || {},
				i = 1,
				length = arguments.length;


			// Handle case when target is a string or something (possible in deep copy)
			if (!_.isObject(target) && !_.isFunction(target)) {
				target = {};
			}

			for ( ; i < length; i++ ) {
				// Only deal with non-null/undefined values
				if ( (options = arguments[ i ]) !== null ) {
					// Extend the base object
					for ( name in options ) {
						src = target[ name ];
						copy = options[ name ];

						// Prevent never-ending loop
						if ( target === copy ) {
							continue;
						}

						// Recurse if we're merging plain objects or arrays
						if ( copy && ( _.isObject(copy) || (copyIsArray = _.isArray(copy)) ) ) {
							if ( copyIsArray ) {
								copyIsArray = false;
								clone = src && _.isArray(src) ? src : [];

							} else {
								clone = src && _.isObject(src) ? src : {};
							}

							// Never move original objects, clone them
							target[ name ] = this.deepMerge(clone, copy );

						// Don't bring in undefined values
						} else if ( copy !== undefined ) {
							target[ name ] = copy;
						}
					}
				}
			}

			// Return the modified object
			return target;
		}
	};
});
