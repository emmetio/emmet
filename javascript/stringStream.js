/**
 * A trimmed version of CodeMirror's StringStream module for string parsing
 */
emmet.define('stringStream', function(require, _) {
	/**
	 * @type StringStream
	 * @constructor
	 * @param {String} string
	 */
	function StringStream(string) {
		this.pos = this.start = 0;
		this.string = string;
	}
	
	StringStream.prototype = {
		/**
		 * Returns true only if the stream is at the end of the line.
		 * @returns {Boolean}
		 */
		eol: function() {
			return this.pos >= this.string.length;
		},
		
		/**
		 * Returns true only if the stream is at the start of the line
		 * @returns {Boolean}
		 */
		sol: function() {
			return this.pos === 0;
		},
		
		/**
		 * Returns the next character in the stream without advancing it. 
		 * Will return <code>undefined</code> at the end of the line.
		 * @returns {String}
		 */
		peek: function() {
			return this.string.charAt(this.pos);
		},
		
		/**
		 * Returns the next character in the stream and advances it.
		 * Also returns <code>undefined</code> when no more characters are available.
		 * @returns {String}
		 */
		next: function() {
			if (this.pos < this.string.length)
				return this.string.charAt(this.pos++);
		},
		
		/**
		 * match can be a character, a regular expression, or a function that
		 * takes a character and returns a boolean. If the next character in the
		 * stream 'matches' the given argument, it is consumed and returned.
		 * Otherwise, undefined is returned.
		 * @param {Object} match
		 * @returns {String}
		 */
		eat: function(match) {
			var ch = this.string.charAt(this.pos), ok;
			if (typeof match == "string")
				ok = ch == match;
			else
				ok = ch && (match.test ? match.test(ch) : match(ch));
			
			if (ok) {
				++this.pos;
				return ch;
			}
		},
		
		/**
		 * Repeatedly calls <code>eat</code> with the given argument, until it
		 * fails. Returns <code>true</code> if any characters were eaten.
		 * @param {Object} match
		 * @returns {Boolean}
		 */
		eatWhile: function(match) {
			var start = this.pos;
			while (this.eat(match)) {}
			return this.pos > start;
		},
		
		/**
		 * Shortcut for <code>eatWhile</code> when matching white-space.
		 * @returns {Boolean}
		 */
		eatSpace: function() {
			var start = this.pos;
			while (/[\s\u00a0]/.test(this.string.charAt(this.pos)))
				++this.pos;
			return this.pos > start;
		},
		
		/**
		 * Moves the position to the end of the line.
		 */
		skipToEnd: function() {
			this.pos = this.string.length;
		},
		
		/**
		 * Skips to the next occurrence of the given character, if found on the
		 * current line (doesn't advance the stream if the character does not
		 * occur on the line). Returns true if the character was found.
		 * @param {String} ch
		 * @returns {Boolean}
		 */
		skipTo: function(ch) {
			var found = this.string.indexOf(ch, this.pos);
			if (found > -1) {
				this.pos = found;
				return true;
			}
		},
		
		/**
		 * Skips to <code>close</code> character which is pair to <code>open</code>
		 * character, considering possible pair nesting. This function is used
		 * to consume pair of characters, like opening and closing braces
		 * @param {String} open
		 * @param {String} close
		 * @returns {Boolean} Returns <code>true</code> if pair was successfully
		 * consumed
		 */
		skipToPair: function(open, close) {
			var braceCount = 0, ch;
			var pos = this.pos, len = this.string.length;
			while (pos < len) {
				ch = this.string.charAt(pos++);
				if (ch == open) {
					braceCount++;
				} else if (ch == close) {
					braceCount--;
					if (braceCount < 1) {
						this.pos = pos;
						return true;
					}
				}
			}
			
			return false;
		},
		
		/**
		 * Backs up the stream n characters. Backing it up further than the
		 * start of the current token will cause things to break, so be careful.
		 * @param {Number} n
		 */
		backUp : function(n) {
			this.pos -= n;
		},
		
		/**
		 * Act like a multi-character <code>eat</code>—if <code>consume</code> is true or
		 * not given—or a look-ahead that doesn't update the stream position—if
		 * it is false. <code>pattern</code> can be either a string or a
		 * regular expression starting with ^. When it is a string,
		 * <code>caseInsensitive</code> can be set to true to make the match
		 * case-insensitive. When successfully matching a regular expression,
		 * the returned value will be the array returned by <code>match</code>,
		 * in case you need to extract matched groups.
		 * 
		 * @param {RegExp} pattern
		 * @param {Boolean} consume
		 * @param {Boolean} caseInsensitive
		 * @returns
		 */
		match: function(pattern, consume, caseInsensitive) {
			if (typeof pattern == "string") {
				var cased = caseInsensitive
					? function(str) {return str.toLowerCase();}
					: function(str) {return str;};
				
				if (cased(this.string).indexOf(cased(pattern), this.pos) == this.pos) {
					if (consume !== false)
						this.pos += pattern.length;
					return true;
				}
			} else {
				var match = this.string.slice(this.pos).match(pattern);
				if (match && consume !== false)
					this.pos += match[0].length;
				return match;
			}
		},
		
		/**
		 * Get the string between the start of the current token and the 
		 * current stream position.
		 * @returns {String}
		 */
		current: function() {
			return this.string.slice(this.start, this.pos);
		}
	};
	
	return {
		create: function(string) {
			return new StringStream(string);
		}
	};
});