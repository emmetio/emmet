/**
 * HTML matcher: takes string and searches for HTML tag pairs for given position 
 * 
 * Unlike “classic” matchers, it parses content from the specified 
 * position, not from the start, so it may work even outside HTML documents
 * (for example, inside strings of programming languages like JavaScript, Python 
 * etc.)
 * @constructor
 * @memberOf __htmlMatcherDefine
 */
emmet.define('htmlMatcher', function(require, _) {
	// Regular Expressions for parsing tags and attributes
	var reOpenTag = /^<([\w\:\-]+)((?:\s+[\w\-:]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/;
	var reCloseTag = /^<\/([\w\:\-]+)[^>]*>/;
	
	function openTag(i, match) {
		return {
			name: match[1],
			selfClose: !!match[3],
			/** @type Range */
			range: require('range').create(i, match[0]),
			type: 'open'
		};
	}
	
	function closeTag(i, match) {
		return {
			name: match[1],
			/** @type Range */
			range: require('range').create(i, match[0]),
			type: 'close'
		};
	}
	
	/**
	 * Creates new tag matcher session
	 * @param {String} text
	 */
	function createMatcher(text) {
		var memo = {}, m;
		return {
			/**
			 * Test if given position matches opening tag
			 * @param {Number} i
			 * @returns {Object} Matched tag object
			 */
			open: function(i) {
				var m = this.matches(i);
				return m && m.type == 'open' ? m : null;
			},
			
			/**
			 * Test if given position matches closing tag
			 * @param {Number} i
			 * @returns {Object} Matched tag object
			 */
			close: function(i) {
				var m = this.matches(i);
				return m && m.type == 'close' ? m : null;
			},
			
			/**
			 * Matches either opening or closing tag for given position
			 * @param i
			 * @returns
			 */
			matches: function(i) {
				var key = 'p' + i;
				
				if (!(key in memo)) {
					if (text.charAt(i) == '<') {
						var substr = text.slice(i);
						if (m = substr.match(reOpenTag)) {
							memo[key] = openTag(i, m);
						} else if (m = substr.match(reCloseTag)) {
							memo[key] = closeTag(i, m);
						} else {
							// remember that given position contains no valid tag
							memo[key] = false;
						}
					}
				}
				
				return memo[key];
			},
			
			/**
			 * Returns original text
			 * @returns {String}
			 */
			text: function() {
				return text;
			}
		};
	}
	
	function matches(text, pos, pattern) {
		return text.substring(pos, pos + pattern.length) == pattern;
	}
	
	/**
	 * Search for closing pair of opening tag
	 * @param {Object} open Open tag instance
	 * @param {Object} matcher Matcher instance
	 */
	function findClosingPair(open, matcher) {
		var stack = [], tag = null;
		var text = matcher.text();
		for (var pos = open.range.end, len = text.length; pos < len; pos++) {
			if (matches(text, pos, '<!--')) {
				// skip to end of comment
				for (var j = pos; j < len; j++) {
					if (matches(text, j, '-->')) {
						pos = j + 3;
						break;
					}
				}
			}
			
			if (tag = matcher.matches(pos)) {
				if (tag.type == 'open') {
					stack.push(tag.name);
				} else if (tag.type == 'close') {
					if (!stack.length) { // found valid pair?
						return tag.name == open.name ? tag : null;
					}
					
					// check if current closing tag matches previously opened one
					if (_.last(stack) == tag.name) {
						stack.pop();
					} else if (tag.name == open.name) {
						// looks like stack contains unclosed elements,
						// but current closing tag matches opening one
						return tag;
					} else {
						// found invalid closing tag
						return null;
					}
				}
			}
			
		}
	}
	
	return {
		/**
		 * Main function: search for tag pair in <code>text</code> for given 
		 * position
		 * @memberOf htmlMatcher
		 * @param {String} text 
		 * @param {Number} pos
		 * @returns {Object}
		 */
		find: function(text, pos) {
			var range = require('range');
			var matcher = createMatcher(text); 
			var open = null, close = null;
			
			for (var i = pos; i >= 0; i--) {
				if (open = matcher.open(i)) {
					// found opening tag
					if (open.selfClose && open.range.cmp(pos, 'lt', 'gt')) {
						// inside self-closing tag
						break;
					}
					
					close = findClosingPair(open, matcher);
					if (close) {
						// found closing tag.
						var r = range.create2(open.range.start, close.range.end);
						console.log('matched content', r.substring(text), r, pos);
						if (r.contains(pos)) {
							console.log('found!');
							break;
						}
					} else if (open.range.contains(pos)) {
						// we inside empty HTML tag like <br>
						break;
					}
					
					open = null;
				} else if (matches(text, i, '-->')) {
					// skip back to comment start
					for (var j = i - 1; j >= 0; j++) {
						if (matches(text, j, '-->')) {
							// found another comment end, do nothing
							break;
						} else if (matches(text, j, '<!--')) {
							i = j;
							break;
						}
					}
				}
			}
			
			if (open) {
				var matchedRange = null;
				if (close) {
					matchedRange = range.create2(open.range.end, close.range.start);
					if (!matchedRange.length() || !matchedRange.cmp(pos, 'lte', 'gte')) {
						matchedRange = range.create2(open.range.start, close.range.end);
					}
				} else {
					matchedRange = range.create2(open.range.start, open.range.end);
				}
				
				return {
					open: open,
					close: close,
					range: matchedRange
				};
			}
		}
	};
});