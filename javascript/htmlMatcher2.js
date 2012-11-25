/**
 * HTML matcher: takes string and searches for HTML tag pairs from specified 
 * position. Unlike “classic” matchers, it parses content from the specified 
 * position, not from the start, so it may work even outside HTML documents
 * (for example, inside strings of programming languages like JavaScript, Python 
 * etc.)
 */
emmet.define('htmlMatcher', function(require, _) {
	// Regular Expressions for parsing tags and attributes
	var reStartTag = /^<([\w\:\-]+)((?:\s+[\w\-:]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/;
	var reEndTag = /^<\/([\w\:\-]+)[^>]*>/;
	var reAttr = /([\w\-:]+)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|([^>\s]+)))?/g;
		
	// Empty Elements - HTML 4.01
	var empty = makeMap("area base basefont br col frame hr img input isindex link meta param embed");

	// Block Elements - HTML 4.01
	var block = makeMap("address applet blockquote button center dd dir div dl dt fieldset form frameset hr iframe isindex li map menu noframes noscript object ol p pre script table tbody td tfoot th thead tr ul");

	// Inline Elements - HTML 4.01
	var inline = makeMap("a abbr acronym applet b basefont bdo big br button cite code del dfn em font i iframe img input ins kbd label map object q s samp select small span strike strong sub sup textarea tt u var");

	// Elements that you can, intentionally, leave open
	// (and which close themselves)
	var close_self = makeMap("colgroup dd dt li options p td tfoot th thead tr");
	
	/** Last matched HTML pair */
	var lastMatch = {
		opening_tag: null, // tag() or comment() object
		closing_tag: null, // tag() or comment() object
		start_ix: -1,
		end_ix: -1
	};
	
	function tag(match, ix) {
		return {
			type: 'tag',
			name: match[1].toLowerCase(),
			fullTag: match[0],
			range: require('range').create(ix, match[0]),
			selfClosed: !!match[3]
		};
	}
	
	function comment(start, end) {
		return {
			type: 'comment',
			range: require('range').create2(start, end)
		};
	}
	
	function makeMap(str){
		var obj = {}, items = str.split(' ');
		for (var i = 0; i < items.length; i++) {
			obj[items[i]] = true;
		}
		return obj;
	}
	
	/**
	 * Makes selection ranges for matched tag pair
	 * @param {tag} opening_tag
	 * @param {tag} closing_tag
	 * @param {Number} ix
	 */
	function makeRange(opening_tag, closing_tag, ix) {
		ix = ix || 0;
		
		var start_ix = -1, 
			end_ix = -1;
		
		if (opening_tag && !closing_tag) { // unary element
			start_ix = opening_tag.start;
			end_ix = opening_tag.end;
		} else if (opening_tag && closing_tag) { // complete element
			if (
				(opening_tag.start < ix && opening_tag.end > ix) || 
				(closing_tag.start <= ix && closing_tag.end > ix)
			) {
				start_ix = opening_tag.start;
				end_ix = closing_tag.end;
			} else {
				start_ix = opening_tag.end;
				end_ix = closing_tag.start;
			}
		}
		
		return [start_ix, end_ix];
	}
	
	/**
	 * Save matched tag for later use and return found indexes
	 * @param {tag} opening_tag
	 * @param {tag} closing_tag
	 * @param {Number} ix
	 * @return {Array}
	 */
	function saveMatch(opening_tag, closing_tag, ix) {
		ix = ix || 0;
		lastMatch.opening_tag = opening_tag; 
		lastMatch.closing_tag = closing_tag;
		
		var range = makeRange(opening_tag, closing_tag, ix);
		lastMatch.start_ix = range[0];
		lastMatch.end_ix = range[1];
		
		return lastMatch.start_ix != -1 ? [lastMatch.start_ix, lastMatch.end_ix] : null;
	}
	
	/**
	 * Search for matching tags in <code>html</code>, starting from 
	 * <code>start_ix</code> position
	 * @param {String} html Code to search
	 * @param {Number} start Character index where to start searching pair 
	 * (commonly, current caret position)
	 * @param {Function} action Function that creates selection range
	 * @return {Array}
	 */
	function findPair(html, start, action) {
		action = action || makeRange;
		
		var forwardStack = [];
		var backwardStack = [];
		
		/** @type {tag} */
		var openingTag = null;
		/** @type {tag} */
		var closingTag = null;
		var htmlLen = html.length;
		
		forwardStack.last = backwardStack.last = function() {
			return this[this.length - 1];
		};
		
		var m, ix = start, tmpTag;
		
		function hasMatch(str, start) {
			if (arguments.length == 1)
				start = ix;
			return html.substr(start, str.length) == str;
		}
		
		function searchCommentStart(from) {
			while (from--) {
				if (html.charAt(from) == '<' && hasMatch('<!--', from))
					break;
			}
			
			return from;
		}
		
		// find opening tag
		while (ix-- >= 0) {
			var ch = html.charAt(ix);
			if (ch == '<') {
				var checkStr = html.substring(ix);
				if ( (m = checkStr.match(reEndTag)) ) { // found closing tag
					tmpTag = tag(m, ix);
					if (tmpTag.range.inside(start)) { // direct hit on searched closing tag
						closingTag = tmpTag;
					} else {
						backwardStack.push(tmpTag);
					}
				} else if ( (m = checkStr.match(reStartTag)) ) { // found opening tag
					tmpTag = tag(m, ix);
					
					if (tmpTag.selfClosed) {
						if (tmpTag.range.inside(start)) { // exact match
							return action(tmpTag, null, start);
						}
					} else if (backwardStack.length && backwardStack.last().name == tmpTag.name) {
						backwardStack.pop();
					} else { // found nearest unclosed tag
						openingTag = tmpTag;
						break;
					}
				} else if (hasMatch('<!--')) { // found comment start
					var endIx = checkStr.search('-->') + ix + 3;
					if (ix < start && endIx >= start)
						return action(comment(ix, endIx));
				}
			} else if (ch == '-' && hasMatch('-->')) { // found comment end
				// search left until comment start is reached
				ix = searchCommentStart(ix);
			}
		}
		
		if (!openingTag)
			return action();
		
		// find closing tag
		if (!closingTag) {
			for (ix = start; ix < htmlLen; ix++) {
				var ch = html.charAt(ix);
				if (ch == '<') {
					var check_str = html.substring(ix, htmlLen);
					
					if ( (m = check_str.match(reStartTag)) ) { // found opening tag
						tmpTag = tag(m, ix);
						if (!tmpTag.unary)
							forwardStack.push( tmpTag );
					} else if ( (m = check_str.match(reEndTag)) ) { // found closing tag
						var tmp_tag = tag(m, ix);
						if (forwardStack.last() && forwardStack.last().name == tmp_tag.name)
							forwardStack.pop();
						else { // found matched closing tag
							closingTag = tmp_tag;
							break;
						}
					} else if (hasMatch('<!--')) { // found comment
						ix += check_str.search('-->') + 2;
					}
				} else if (ch == '-' && hasMatch('-->')) {
					// looks like cursor was inside comment with invalid HTML
					if (!forwardStack.last() || forwardStack.last().type != 'comment') {
						var end_ix = ix + 3;
						return action(comment( searchCommentStart(ix), end_ix ));
					}
				}
			}
		}
		
		return action(openingTag, closingTag, start);
	}
	
	return {
		/**
		 * Search for matching tags in <code>html</code>, starting 
		 * from <code>start</code> position. The result is automatically saved in 
		 * internally and available by <code>lastMatch()</code> method call
		 * @param {String} html Code where to search tags
		 * @param {Number} start Search start position. The search is performed
		 * backward from current position
		 * @return {Object}
		 */
		match: function(html, start) {
			return findPair(html, start, saveMatch);
		},
		
		/**
		 * Search for matching tags in <code>html</code>, starting from 
		 * <code>start</code> position. Unlike <code>match()</code> method,
		 * it doesn’t store matched result as <i>last match</i>. 
		 * This method is generally used for lookups
		 * @param {String} html Code where to search tags
		 * @param {Number} start Search start position. The search is performed
		 * backward from current position
		 * @return {Object} 
		 */
		find: function(html, start) {
			return findPair(html, start, mode);
		},
		
		/**
		 * Returns previous matched tag pair
		 * @returns {Object}
		 */
		lastMatch: function() {
			return lastMatch;
		}
	};
});