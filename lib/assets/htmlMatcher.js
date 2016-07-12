/**
 * HTML matcher: takes string and searches for HTML tag pairs for given position 
 * 
 * Unlike “classic” matchers, it parses content from the specified 
 * position, not from the start, so it may work even outside HTML documents
 * (for example, inside strings of programming languages like JavaScript, Python 
 * etc.)
 */
if (typeof module === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		module.exports = factory(require, exports, module);
	};
}

define(function(require, exports, module) {
	var range = require('./range');

	// Regular Expressions for parsing tags and attributes
	var reOpenTag = /^<([\w\:\-]+)((?:\s+[\w\-:]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/;
	var reCloseTag = /^<\/([\w\:\-]+)[^>]*>/;

	function openTag(i, match) {
		return {
			name: match[1].toLowerCase(),
			selfClose: !!match[3],
			/** @type Range */
			range: range(i, match[0]),
			type: 'open'
		};
	}
	
	function closeTag(i, match) {
		return {
			name: match[1].toLowerCase(),
			/** @type Range */
			range: range(i, match[0]),
			type: 'close'
		};
	}

	function comment(i, j) {
		return {
			/** @type Range */
			range: range(i, j - i),
			type: 'comment'
		};
	}

	/**
	 *  A Range object is used to markup which part of the text is scanned and
	 *  can be skipped.
	 *  
	 *  range.next, range.prev is the pointers to other ranges. Match.back, 
	 *  Match.next will search the sequence to check if the tag belongs to the
	 *  range.
	 */
	var Range = function(start, end) {
		this.start = start;
		this.end = end;
		this.next = null;
		this.prev = null;
	};
	
	/**
	 *  Extend the range with another range. We have to search the sequence for
	 *  the position of the new range.
	 */
	Range.prototype.extend = function(range){
		// find the right most range that l.start < range.start
		var l = this;
		if (l.start < range.start) {
			while (l.next && l.next.start < range.start) {
				l = l.next;
			}
		} else {
			while (l && l.start >= range.start) {
				l = l.prev;
			}
		}
		// find the left most range that r.end > range.end
		var r = this;
		if (r.end > range.end) {
			while (r.prev && r.prev.end > range.end) {
				r = r.prev;
			}
		} else {
			while (r && r.end <= range.end) {
				r = r.next;
			}
		}
		
		var c, n;
		
		if (!l) {
			if (!r) {
				// cover all ranges
				// to right
				c = this.next;
				while (c) {
					n = c.next;
					c.prev = range;
					c.next = range;
					c = n;
				}
				// to left
				c = this.prev;
				while (c) {
					n = c.prev;
					c.prev = range;
					c.next = range;
					c = n;
				}
				// self
				this.prev = range;
				this.next = range;
			} else {
				// cover from r.prev to left
				// to left
				c = r.prev;
				while (c) {
					n = c.prev;
					c.prev = range;
					c.next = range;
					c = n;
				}
				// r
				r.prev = range;
				range.next = r;
			}
		} else {
			if (!r) {
				// cover from l.next to right
				c = l.next;
				while (c) {
					n = c.next;
					c.prev = range;
					c.next = range;
					c = n;
				}
				// l
				l.next = range;
				range.prev = l;
			} else {
				if (l == r) {
					// inside l (r)
					range.prev = l;
					range.next = l;
				} else {
					// cover from l.next to r.prev
					c = l.next;
					while (c != r) {
						n = c.next;
						c.prev = range;
						c.next = range;
						c = n;
					}
					// insert between l, r
					l.next = range;
					range.prev = l;
					range.next = r;
					r.prev = range;
				}
			}
		}
		
		return range;
	};
			
	// Find @token in @text.
	var Match = function(text, startPos, token, name, excludeRange) {
		this.text = text;
		this.i = startPos;
		this.token = token;
		this.name = name;
		this.excludeRange = excludeRange;
		this.tag = null;
	};
	
	// Backward search the token. The result will be put in Match.tag.
	Match.prototype.back = function(){
		var tag, ex;
		
		if (this.i < 0) {
			return;
		}
		
		// check if the tag is inside exclude range
		ex = this.excludeRange;
		if (this.tag) {
			// jump over
			while (ex.prev && ex.prev.end >= this.tag.range.end) {
				ex = ex.prev;
			}
			if (this.tag.range.start >= ex.start) {
				this.tag = null;
			} else {
				this.excludeRange = ex;
				return;
			}
		}
		
		do {
			this.i = this.text.lastIndexOf(this.token, this.i);
			if (this.i < 0) {
				return;
			}
			// jump over
			while (ex.prev && ex.prev.end > this.i) {
				ex = ex.prev;
			}
			this.excludeRange = ex;
			// jump to end
			if (ex.start <= this.i && ex.end > this.i) {
				this.i = ex.start - 1;
				continue;
			}
			tag = matchTag(this.i, this.text);
			if (tag) {
				if (
					!tag.selfClose &&
					(!this.name || tag.name == this.name) &&
					(!this.excludeName || !this.excludeName[tag.name])
				) {
					this.tag = tag;
				}
				this.i = tag.range.start - 1;
			} else {
				this.i--;
			}
		} while (!this.tag && this.i >= 0);
	};
	
	// Forward search the token. The result will be put in Match.tag.
	Match.prototype.next = function() {
		var tag, ex;
		
		if (this.i < 0) {
			return;
		}
		
		ex = this.excludeRange;
		if (this.tag) {
			while (ex.next && ex.next.start <= this.tag.range.start) {
				ex = ex.next;
			}
			if (ex.end >= this.tag.range.end) {
				this.tag = null;
			} else {
				this.excludeRange = ex;
				return;
			}
		}
		
		do {
			this.i = this.text.indexOf(this.token, this.i);
			if (this.i < 0) {
				return;
			}
			// jump over
			while (ex.next && ex.next.start <= this.i) {
				ex = ex.next;
			}
			// jump to end
			if (ex.start <= this.i && ex.end > this.i) {
				this.i = ex.end;
				continue;
			}
			tag = matchTag(this.i, this.text);
			if (tag) {
				if (
					!tag.selfClose &&
					(!this.name || tag.name == this.name) &&
					(!this.excludeName || !this.excludeName[tag.name])
				) {
					this.tag = tag;
				}
				this.i = tag.range.end;
			} else {
				this.i++;
			}
		} while (!this.tag);
	};
	
	// Add more exclude range
	Match.prototype.addExclude = function(range){
		this.excludeRange.extend(range);
	};
	
	// A group of multiple Match.
	var MatchGroup = function(matches){
		this.matches = matches;
	};
	
	// Do forward search for each Match, yield the first item with lowest start index.
	MatchGroup.prototype.next = function(){
		var i, len = this.matches.length;
		for (i = 0; i < len; i++) {
			this.matches[i].next();
		}
		var result;
		for (i = 0; i < len; i++) {
			if (this.matches[i].tag && (!result ||  this.matches[i].tag.range.start < result.tag.range.start)) {
				result = this.matches[i];
			}
		}
		if (!result) {
			return;
		}
		var tag = result.tag;
		result.tag = null;
		return tag;
	};
	
	// Do backward search for each Match, yield the first item with largest end index.
	MatchGroup.prototype.back = function(){
		var i, len = this.matches.length;
		for (i = 0; i < len; i++) {
			this.matches[i].back();
		}
		var result;
		for (i = 0; i < len; i++) {
			if (this.matches[i].tag && (!result ||  this.matches[i].tag.range.end > result.tag.range.end)) {
				result = this.matches[i];
			}
		}
		if (!result) {
			return;
		}
		var tag = result.tag;
		result.tag = null;
		return tag;
	};
	
	// Add exclude range for each Match
	MatchGroup.prototype.exclude = function(){
		this.matches[0].excludeRange.extend();
	};
	
	// A pair of tag, use by Tree
	var TagPair = function(open, close) {
		this.open = open;
		this.close = close;
	};
	
	// The result class of Tree.next
	var TreeResult = function(tag, detached, finished){
		this.tag = tag;
		this.detached = detached;
		this.finished = finished;
	};
	
	TreeResult.finished = new TreeResult(null, null, true);
	
	// Tag tree, built with a MatchGroup. It has a stack to save the match result
	var Tree = function(matchGroup, direction, root) {
		this.matchGroup = matchGroup;
		this.root = root;
		this.stack = [];
		this.direction = direction;
		this.finished = false;
		
		if (direction == "next") {
			this.openType = "open";
			this.closeHandle = this.handleNextClose;
		} else {
			this.openType = "close";
			this.closeHandle = this.handleBackOpen;
		}
	};
	
	// Close tag handler for forward search
	Tree.prototype.handleNextClose = function(tag) {
		var open;
		while (this.stack.length) {
			open = this.stack.pop();
			// paired
			if (open.name == tag.name) {
				return new TreeResult(tag, new TagPair(open, tag), false);
			}
		}
		// no pair, no root, found
		if (!this.root) {
			this.finished = true;
			return new TreeResult(tag, null, true);
		}
		// paired with root
		if (this.root.name == tag.name) {
			this.finished = true;
			return new TreeResult(tag, new TagPair(this.root, tag), true);
		}
		// can't pair root?
		this.finised = true;
		return new TreeResult(tag, null, true);
	};
	
	// Close tag handler for backward search
	Tree.prototype.handleBackOpen = function(tag) {
		var len = this.stack.length;
		if (!len) {
			// Pending
			if (!this.root) {
				this.finished = true;
				return new TreeResult(tag, null, true);
			}
			// Found
			if (tag.name == this.root.name) {
				this.finished = true;
				return new TreeResult(tag, new TagPair(tag, this.root), true);
			}
			// Unary open tag
			return new TreeResult(tag, null, false);
		}
		if (this.stack[len - 1].name == tag.name) {
			// paired
			return new TreeResult(tag, new TagPair(tag, this.stack.pop()), false);
		}
		// Unary open
		return new TreeResult(tag, null, false);
	};
	
	// Reset finished flag and keep searching.
	Tree.prototype.keepOn = function(){
		this.finished = false;
	};
	
	// Yield a tag
	Tree.prototype.next = function(){
		if (this.finished) {
			return TreeResult.finished;
		}
		
		var tag = this.matchGroup[this.direction]();
		
		if (!tag) {
			this.finished = true;
			return TreeResult.finished;
		}
		
		if (tag.type == this.openType) {
			this.stack.push(tag);
			return new TreeResult(tag, null, false);
		} else {
			return this.closeHandle(tag);
		}			
	};
	
	// Remove node that is excluded
	Tree.prototype.stackExclude = function(range) {
		if (this.root && this.root.range.start >= range.start && this.root.range.end <= range.end) {
			this.finished = true;
			return;
		}
		var i = this.stack.length, tag;
		while (i) {
			tag = this.stack[i - 1];
			if (tag.range.start >= range.end || tag.range.end <= range.start) {
				break;
			}
			this.stack.pop();
			i--;
		}
	};
	
	Tree.prototype.getExclude = function() {
		return this.matchGroup.matches[0].excludeRange;
	};
	
	/**
	 *  Main Search class. It can be forward search or backward search by
	 *  setting @direction. It will create different tag tree for founded tags.
	 */
	var Search = function(text, i, direction, excludeRange){
		this.text = text;
		this.direction = direction;
		this.excludeRange = excludeRange;
		this.finished = false;
		this.tag = null;
		this.trees = [];
		this.pool = {};
		this.explicit = null;
		this.explicitPending = null;
		this.explicitWeak = null;
		this.main = new Tree(
			new MatchGroup([
				new Match(text, i, "<", null, excludeRange)
			]),
			direction,
			null
		);
		if (direction == "next") {
			this.openType = "open";
			this.getStartPos = this.getForwardStartPos;
		} else {
			this.openType = "close";
			this.getStartPos = this.getBackwardStartPos;
		}
	};
	
	// The start pos is different with backward/forward search!
	Search.prototype.getForwardStartPos = function(tag, i) {
		if (i == null || tag.range.end > i) {
			return tag.range.end;
		}
		return i;
	};
	
	Search.prototype.getBackwardStartPos = function(tag, i) {
		if (i == null || tag.range.start - 1 < i) {
			return tag.range.start - 1;
		}
		return i;
	};
		
	Search.prototype.createTree = function(tag, i){
		i = this.getStartPos(tag, i);
		this.excludeRange = this.main.getExclude();
		return new Tree(
			new MatchGroup([
				new Match(this.text, i, "<" + tag.name, tag.name, this.excludeRange),
				new Match(this.text, i, "</" + tag.name, tag.name, this.excludeRange)
			]),
			this.direction,
			tag
		);
	};
	
	// Yield a tag
	Search.prototype.next = function(){
		var result, range;
		
		if (this.explicit && !this.explicitPending) {
			result = this.explicit.next();
			if (result.finished) {
				if (result.tag) {
					this.finished = true;
					this.tag = result.tag;
					return;
				} else if (this.explicitWeak) {
					// wrong explicit
					this.pool[this.explicit.root.name] = null;
					this.explicit = null;
					this.main.root = null;
				} else {
					// can't find
					this.finished = true;
					return;
				}
			}
			if (result.detached) {
				range = new Range(
					result.detached.open.range.start,
					result.detached.close.range.end
				);
				this.explicit.matchGroup.matches[0].excludeRange.extend(range);
				this.cleanTreeStack(range);
			}
		}
		
		result = this.main.next();
		
		if (result.finished) {
			this.finished = true;
			this.tag = result.tag;
			return;
		}
		
		if (result.tag.type == this.openType && !this.pool[result.tag.name]) {
			this.pool[result.tag.name] = this.createTree(result.tag);
			this.trees.push(result.tag.name);
		}
		
		var i = this.trees.length, name;
		while (i) {
			name = this.trees[i - 1];
			result = this.pool[name].next();
			if (result.detached) {
				range = new Range(
					result.detached.open.range.start,
					result.detached.close.range.end
				);
				this.pool[name].matchGroup.matches[0].excludeRange.extend(range);
				this.cleanTreeStack(range);
			}
			i--;
		}
		
		// remove finished trees
		i = this.trees.length;
		while (i) {
			if (this.pool[this.trees[i - 1]].finished) {
				this.pool[this.trees[i - 1]] = null;
				this.trees[i - 1] = this.trees[this.trees.length - 1];
				this.trees.pop();
			}
			i--;
		}
		
		if (this.explicitPending && this.explicitPending.finished) {
			this.pool[this.explicitPending.root.name] = true;
			this.explicitPending = null;
		}
	};
	
	// When an excludeRange is added, extending current range is not enough. We have to tell every trees to clean up their tag stack.
	Search.prototype.cleanTreeStack = function(range) {
		this.main.stackExclude(range);
		if (this.explicit) {
			this.explicit.stackExclude(range);
		}
		
		var i, len;
		for (i = 0, len = this.trees.length; i < len; i++) {
			this.pool[this.trees[i]].stackExclude(range);
		}
	};
	
	// Make the search explicitly match a open/close tag. If weak is true, the tag might be a wrong guess.
	Search.prototype.keepMatchingPair = function(tag, weak) {
		this.tag = null;
		this.finished = false;
		this.main.finished = false;
		this.main.root = tag;
		this.explicit = this.createTree(tag, this.main.matchGroup.matches[0].i);
		this.explicitWeak = weak;
		if (this.pool[tag.name]) {
			this.explicitPending = this.pool[tag.name];
		} else {
			this.pool[tag.name] = true;
		}
	};
		
	// Match a tag on @pos. This is used by Match.next, Match.back
	function matchTag(pos, text) {
		var match;
		if (text[pos + 1] == "/") {
			// close
			if ((match = text.substr(pos).match(reCloseTag))) {
				return closeTag(pos, match);
			}
		} else if (text[pos + 1] == "!" && text[pos + 2] == "-" && text[pos + 3] == "-") {
			// comment
			if ((match = text.indexOf("-->", pos + 4)) >= 0) {
				return comment(pos, match + 3);
			}
		} else if ((match = text.substr(pos).match(reOpenTag))) {
			// open
			return openTag(pos, match);
		}
	}
	
	// Create a new HTMLMatcher with @text and start @pos.
	function createMatcher(text, pos) {
		var excludeRange;
		
		function buildExclude(i, j) {
			var range = excludeRange = new Range(pos, pos);
			while ((i = text.indexOf("<!--", i)) >= 0 && i < j) {
				var tag = matchTag(i, text);
				if (!tag) {
					i++;
				} else {
					i = tag.range.end;
					range = range.extend(new Range(
						tag.range.start,
						tag.range.end
					));
				}
			}
		}
		
		return {
			// Main search function
			search: function(){
				var tag;
				
				tag = this.hit();				
				if (tag) {
					if (tag.type == "comment" || tag.selfClose) {
						return [tag, null];
					} else if (tag.type == "open") {
						buildExclude(tag.range.end, text.length);
						return this.forward(tag);
					} else {
						buildExclude(0, tag.range.start);
						return this.backward(tag);
					}
				} else {
					buildExclude(0, text.length);
					return this.loop();
				}
			},
			backward: function(close){
				var backward = new Search(text, close.range.start - 1, "back", excludeRange);
				
				backward.keepMatchingPair(close);
				
				while (!backward.finished) {
					backward.next();
				}
				
				return [backward.tag, close];
			},
			forward: function(open){
				var forward = new Search(text, open.range.end, "next", excludeRange);
				
				forward.keepMatchingPair(open);
				
				while (!forward.finished) {
					forward.next();
				}
				
				return [open, forward.tag];
			},
			loop: function() {
				var forward = new Search(text, pos, "next", excludeRange),
					backward = new Search(text, pos - 1, "back", excludeRange);
					
				while (!forward.finished && !backward.finished) {
					forward.next();
					backward.next();
				}
				
				if (backward.tag && !forward.finished) {
					forward.keepMatchingPair(backward.tag, true);
				}
				
				while (!forward.finished) {
					forward.next();
				}
				
				if (!forward.tag) {
					return;
				}
				
				if (!backward.tag || backward.tag.name != forward.tag.name) {
					backward.keepMatchingPair(forward.tag);
				}
				
				while (!backward.finished) {
					backward.next();
				}
				
				return [backward.tag, forward.tag];
			},
			hit: function(){
				// Try to hit comment
				var i = text.lastIndexOf("<!--", pos - 1), tag;
				if (i >= 0) {
					tag = matchTag(i, text);
					if (tag && tag.range.end > pos) {
						return tag;
					}
				}
				// hit tag
				i = pos - 1;
				while (i >= 0 && (i = text.lastIndexOf("<", i)) >= 0) {
					tag = matchTag(i, text);
					if (!tag) {
						i--;
					} else {
						if (tag.range.end > pos) {
							return tag;
						}
						break;
					}
				}
			}
		};
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
			var matcher = createMatcher(text, pos);
			
			var pair = matcher.search();
			if (!pair) {
				return;
			}
			
			var open = pair[0], close = pair[1];

			if (open) {
				var outerRange = null;
				var innerRange = null;
				
				if (close) {
					outerRange = range.create2(open.range.start, close.range.end);
					innerRange = range.create2(open.range.end, close.range.start);
				} else {
					outerRange = innerRange = range.create2(open.range.start, open.range.end);
				}
				
				if (open.type == 'comment') {
					// adjust positions of inner range for comment
					var _c = outerRange.substring(text);
					innerRange.start += _c.length - _c.replace(/^<\!--\s*/, '').length;
					innerRange.end -= _c.length - _c.replace(/\s*-->$/, '').length;
				}
				
				return {
					open: open,
					close: close,
					type: open.type == 'comment' ? 'comment' : 'tag',
					innerRange: innerRange,
					innerContent: function() {
						return this.innerRange.substring(text);
					},
					outerRange: outerRange,
					outerContent: function() {
						return this.outerRange.substring(text);
					},
					range: !innerRange.length() || !innerRange.cmp(pos, 'lte', 'gte') ? outerRange : innerRange,
					content: function() {
						return this.range.substring(text);
					},
					source: text
				};
			}
		},
		
		/**
		 * The same as <code>find()</code> method, but restricts matched result 
		 * to <code>tag</code> type
		 * @param {String} text 
		 * @param {Number} pos
		 * @returns {Object}
		 */
		tag: function(text, pos) {
			var result = this.find(text, pos);
			if (result && result.type == 'tag') {
				return result;
			}
		}
	};
});