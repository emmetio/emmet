if (typeof module === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		module.exports = factory(require, exports, module);
	};
}

define(function(require, exports, module) {
	var _ = require('lodash');
	var utils = require('./common');
	var range = require('../assets/range');
	var stringStream = require('../assets/stringStream');
	var cssParser = require('../parser/css');

	var reSpaceTrim = /^(\s*).+?(\s*)$/;
	var reSpace = /\s/g;
	var reSelSpaces = /[ \t]+/g;

	function isQuote(ch) {
		return ch == '"' || ch == "'";
	}

	/**
	 * Replaces contents of given ranges inside `content`
	 * with passed character
	 * @param  {String} content
	 * @param  {Array} ranges
	 * @return {String}
	 */
	function replaceWith(content, ranges, ch) {
		if (ranges.length) {
			var offset = 0, fragments = [];
			_.each(ranges, function(r) {
				var spaces = utils.repeatString(ch, r[1] - r[0]);
				fragments.push(content.substring(offset, r[0]), spaces);
				offset = r[1];
			});

			content = fragments.join('') + content.substring(offset);
		}

		return content;
	}

	/**
	 * Normalizes selector
	 * @param  {String} sel
	 * @return {String}
	 */
	function normalizeSelector(sel) {
		return utils.trim(sel).replace(reSelSpaces, ' ');
	}

	/**
	 * @param {Range} range Full selector range with additional
	 * properties for matching name and content (@see findAllRules())
	 * @param {String} source CSS source
	 */
	function CSSSection(rng, source) {
		/** @type {CSSSection} */
		this.parent = null;
		/** @type {CSSSection} */
		this.nextSibling = null;
		/** @type {CSSSection} */
		this.previousSibling = null;
		this._source = source;
		this._name = null;

		/**
		 * Custom data for current nodes, used by other modules for
		 * caching etc.
		 * @type {Object}
		 */
		this._data = {};

		if (!rng && source) {
			rng = range(0, source);
		}

		this.range = rng;
		this.children = [];
	}

	CSSSection.prototype = {
		addChild: function(section) {
			if (!(section instanceof CSSSection)) {
				section = new CSSSection(section);
			}

			var lastChild = _.last(this.children);
			if (lastChild) {
				lastChild.nextSibling = section;
				section.previousSibling = lastChild;
			}
			section.parent = this;

			this.children.push(section);
			return section;
		},

		/**
		 * Returns root node
		 * @return {CSSSection}
		 */
		root: function() {
			var root = this;
			do {
				if (!root.parent) {
					return root;
				}
			} while(root = root.parent);

			return root;
		},

		/**
		 * Returns currect CSS source
		 * @return {String}
		 */
		source: function() {
			return this._source || this.root()._source;
		},

		/**
		 * Returns section name
		 * @return {String}
		 */
		name: function() {
			if (this._name === null) {
				var range = this.nameRange();
				if (range) {
					this._name = range.substring(this.source());
				}
			}

			return this._name;
		},

		/**
		 * Returns section name range
		 * @return {[type]} [description]
		 */
		nameRange: function() {
			if (this.range && '_selectorEnd' in this.range) {
				return range.create2(this.range.start, this.range._selectorEnd);
			}
		},

		/**
		 * Returns deepest child of current section (or section itself) 
		 * which includes given position.
		 * @param  {Number} pos
		 * @return {CSSSection}
		 */
		matchDeep: function(pos) {
			if (!this.range.inside(pos)) {
				return null;
			}

			for (var i = 0, il = this.children.length, m; i < il; i++) {
				m = this.children[i].matchDeep(pos);
				if (m) {
					return m;
				}
			};

			return this.parent ? this : null;
		},

		/**
		 * Returns current and all nested sections ranges
		 * @return {Array}
		 */
		allRanges: function() {
			var out = [];
			if (this.parent) {
				// add current range if it is not root node
				out.push(this.range);
			}

			_.each(this.children, function(child) {
				out = out.concat(child.allRanges());
			});

			return out;
		},

		data: function(key, value) {
			if (typeof value !== 'undefined') {
				this._data[key] = value;
			}

			return this._data[key];
		},

		stringify: function(indent) {
			indent = indent || '';
			var out = '';
			_.each(this.children, function(item) {
				out += indent + item.name().replace(/\n/g, '\\n') + '\n';
				out += item.stringify(indent + '--');
			});

			return out;
		}
	};

	return {
		/**
		 * Finds all CSS rules‘ ranges in given CSS source
		 * @param  {String} content CSS source
		 * @return {Array} Array of ranges
		 */
		findAllRules: function(content) {
			content = this.sanitize(content);
			var stream = stringStream(content);
			var ranges = [], matchedRanges;

			var saveRule = _.bind(function(r) {
				var selRange = this.extractSelector(content, r.start);
				var rule = range.create2(selRange.start, r.end);
				rule._selectorEnd = selRange.end;
				rule._contentStart = r.start;
				ranges.push(rule);
			}, this);

			try {
				var ch;
				while (ch = stream.next()) {
					if (isQuote(ch)) {
						if (!stream.skipString(ch)) {
							throw 'Unterminated string';
						}

						continue;
					}

					if (ch == '{') {
						matchedRanges = this.matchBracesRanges(content, stream.pos - 1);
						_.each(matchedRanges, saveRule);

						if (matchedRanges.length) {
							stream.pos = _.last(matchedRanges).end;
							continue;
						} 
					}
				}
			} catch(e) {}
			
			return ranges.sort(function(a, b) {
				return a.start - b.start;
			});
		},

		/**
		 * Replaces all comments in given CSS source with spaces,
		 * which allows more reliable (and faster) token search
		 * in CSS content
		 * @param  {String} content CSS content
		 * @return {String}
		 */
		stripComments: function(content) {
			var stream = stringStream(content);
			var replaceRanges = [];
			var ch, ch2;

			while ((ch = stream.next())) {
				if (isQuote(ch)) {
					// skip string
					stream.skipString(ch)
					continue;
				} else if (ch === '/') {
					ch2 = stream.peek();
					if (ch2 === '*') { // multiline CSS comment
						stream.start = stream.pos - 1;

						if (stream.skipTo('*/')) {
							stream.pos += 2;
						} else {
							// unclosed comment
							stream.skipToEnd();
						}

						replaceRanges.push([stream.start, stream.pos]);
					} else if (ch2 === '/') {
						// preprocessor’s single line comments
						stream.start = stream.pos - 1;
						while ((ch2 = stream.next())) {
							if (ch2 === '\n' || ch2 == '\r') {
								break
							}
						}

						replaceRanges.push([stream.start, stream.pos]);
					}
				}
			}

			return replaceWith(content, replaceRanges, ' ');
		},

		/**
		 * Matches curly braces content right after given position
		 * @param  {String} content CSS content. Must not contain comments!
		 * @param  {Number} pos     Search start position
		 * @return {Range}
		 */
		matchBracesRanges: function(content, pos, sanitize) {
			if (sanitize) {
				content = this.sanitize(content);
			}

			var stream = stringStream(content);
			stream.start = stream.pos = pos;
			var stack = [], ranges = [];
			var ch;
			while (ch = stream.next()) {
				if (isQuote(ch)) {
					stream.skipString(ch);
					continue;
				}
				if (ch == '{') {
					stack.push(stream.pos - 1);
				} else if (ch == '}') {
					if (!stack.length) {
						throw 'Invalid source structure (check for curly braces)';
					}
					ranges.push(range.create2(stack.pop(), stream.pos));
					if (!stack.length) {
						return ranges;
					}
				}
			}

			return ranges;
		},

		/**
		 * Extracts CSS selector from CSS document from
		 * given position. The selector is located by moving backward
		 * from given position which means that passed position
		 * must point to the end of selector 
		 * @param  {String}  content CSS source
		 * @param  {Number}  pos     Search position
		 * @param  {Boolean} sanitize Sanitize CSS source before processing.
		 * Off by default and assumes that CSS must be comment-free already
		 * (for performance)
		 * @return {Range}
		 */
		extractSelector: function(content, pos, sanitize) {
			if (sanitize) {
				content = this.sanitize(content);
			}

			var skipString = function() {
				var quote = content.charAt(pos);
				if (quote == '"' || quote == "'") {
					while (--pos >= 0) {
						if (content.charAt(pos) == quote && content.charAt(pos - 1) != '\\') {
							break;
						}
					}
					return true;
				}

				return false;
			};

			// find CSS selector
			var ch;
			var endPos = pos;
			while (--pos >= 0) {
				if (skipString()) continue;

				ch = content.charAt(pos);
				if (ch == ')') {
					// looks like it’s a preprocessor thing,
					// most likely a mixin arguments list, e.g.
					// .mixin (@arg1; @arg2) {...}
					while (--pos >= 0) {
						if (skipString()) continue;

						if (content.charAt(pos) == '(') {
							break;
						}
					}
					continue;
				}

				if (ch == '{' || ch == '}' || ch == ';') {
					pos++;
					break;
				}
			}

			if (pos < 0) {
				pos = 0;
			}
			
			var selector = content.substring(pos, endPos);

			// trim whitespace from matched selector
			var m = selector.replace(reSpace, ' ').match(reSpaceTrim);
			if (m) {
				pos += m[1].length;
				endPos -= m[2].length;
			}

			return range.create2(pos, endPos);
		},

		/**
		 * Search for nearest CSS rule/section that contains
		 * given position
		 * @param  {String} content CSS content or matched CSS rules (array of ranges)
		 * @param  {Number} pos     Search position
		 * @return {Range}
		 */
		matchEnclosingRule: function(content, pos) {
			if (_.isString(content)) {
				content = this.findAllRules(content);
			}

			var rules = _.filter(content, function(r) {
				return r.inside(pos);
			});

			return _.last(rules);
		},

		/**
		 * Locates CSS rule next or before given position
		 * @param  {String}  content    CSS content
		 * @param  {Number}  pos        Search start position
		 * @param  {Boolean} isBackward Search backward (find previous rule insteaf of next one)
		 * @return {Range}
		 */
		locateRule: function(content, pos, isBackward) {
			var rules = this.findAllRules(content);
			var ctxRule = this.matchEnclosingRule(rules, pos);

			if (ctxRule) {
				return ctxRule;

				// XXX why did I did this? Have to figure out
				// 
				// we have a context rule but it may contain nested rules
				// rules = _.filter(rules, function(r) {
				// 	return ctxRule.contains(r);
				// });

				// console.log('Nested rules', rules);


				// // no nested rules
				// if (!rules.length) {
				// 	return ctxRule;
				// }
			}

			for (var i = 0, il = rules.length; i < il; i++) {
				if (rules[i].start > pos) {
					return rules[isBackward ? i - 1 : i];
				}
			}
		},

		/**
		 * Sanitizes given CSS content: replaces content that may 
		 * interfere with parsing (comments, interpolations, etc.)
		 * with spaces. Sanitized content MUST NOT be used for
		 * editing or outputting, it just simplifies searching
		 * @param  {String} content CSS content
		 * @return {String}
		 */
		sanitize: function(content) {
			content = this.stripComments(content);

			// remove preprocessor string interpolations like #{var}
			var stream = stringStream(content);
			var replaceRanges = [];
			var ch, ch2;

			while ((ch = stream.next())) {
				if (isQuote(ch)) {
					// skip string
					stream.skipString(ch)
					continue;
				} else if (ch === '#' || ch === '@') {
					ch2 = stream.peek();
					if (ch2 === '{') { // string interpolation
						stream.start = stream.pos - 1;

						if (stream.skipTo('}')) {
							stream.pos += 1;
						} else {
							throw 'Invalid string interpolation at ' + stream.start;
						}

						replaceRanges.push([stream.start, stream.pos]);
					}
				}
			}

			return replaceWith(content, replaceRanges, 'a');
		},

		/**
		 * Parses and returns all sections in given CSS
		 * as tree-like structure, e.g. provides nesting
		 * info
		 * @param  {String} content CSS content
		 * @return {CSSSection}
		 */
		sectionTree: function(content) {
			var root = new CSSSection(null, content);
			var rules = this.findAllRules(content);

			// rules are sorted in order they appear in CSS source
			// so we can optimize their nesting routine
			var insert = function(range, ctx) {
				while (ctx && ctx.range) {
					if (ctx.range.contains(range)) {
						return ctx.addChild(range);
					}

					ctx = ctx.parent;
				}

				// if we are here then given range is a top-level section
				return root.addChild(range);
			};

			var ctx = root;
			_.each(rules, function(r) {
				ctx = insert(r, ctx);
			});

			return root;
		},

		/**
		 * Returns ranges for all nested sections, available in
		 * given CSS rule
		 * @param  {CSSEditContainer} rule
		 * @return {Array}
		 */
		nestedSectionsInRule: function(rule) {
			var offset = rule.valueRange(true).start;
			var nestedSections = this.findAllRules(rule.valueRange().substring(rule.source));
			_.each(nestedSections, function(section) {
				section.start += offset;
				section.end += offset;
				section._selectorEnd += offset;
				section._contentStart += offset;
			});
			return nestedSections;
		},

		/**
		 * Splits given selector by comma
		 * @param {String} selector
		 * @return {Array} Array of selector parts, normalized
		 */
		splitSelector: function(selector) {
			// parse name with CSS parser to remove redundant tokens
			var tokens = _.isArray(selector) ? selector : cssParser.lex(selector);
			tokens = _.filter(tokens, function(item) {
				return item.type !== 'comment';
			});

			var cur = '', selectors = [], t;
			for (var i = 0, il = tokens.length; i < il; i++) {
				t = tokens[i];
				if (t.type === ',') {
					selectors.push(normalizeSelector(cur));
					cur = '';
				} else if (t.type === 'line') {
					cur += ' ';
				} else {
					cur += t.value;
				}
			}

			selectors.push(normalizeSelector(cur));
			return _.compact(selectors);
		},

		CSSSection: CSSSection
	};
});