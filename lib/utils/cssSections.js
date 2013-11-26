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

	/**
	 * @param {Range} range Full selector range with additional
	 * properties for matching name and content (@see findAllRules())
	 * @param {String} source CSS source
	 */
	function CSSSection(range, source) {
		/** @type {CSSSection} */
		this.parent = null;
		/** @type {CSSSection} */
		this.nextSibling = null;
		/** @type {CSSSection} */
		this.previousSibling = null;
		this.range = range;
		this._source = source;
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
			var range = this.nameRange();
			if (range) {
				return range.substring(this.source());
			}
		},

		/**
		 * Returns section name range
		 * @return {[type]} [description]
		 */
		nameRange: function() {
			if (this.range) {
				return range.create2(this.range.start, this.range._selectorEnd);
			}
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
			content = this.stripComments(content);
			var stream = stringStream(content);
			var ranges = [], matchedRanges;
			var that = this;

			var saveRule = _.bind(function(r) {
				var selRange = this.extractSelector(content, r.start);
				var rule = range.create2(selRange.start, r.end);
				rule._selectorEnd = selRange.end;
				rule._contentStart = r.start;
				ranges.push(rule);
			}, this);

			try {
				while (!stream.eol()) {
					if (stream.peek() == '{') {
						matchedRanges = this.matchBracesRanges(content, stream.pos);
						_.each(matchedRanges, saveRule);

						if (matchedRanges.length) {
							stream.pos = _.last(matchedRanges).end;
							continue;
						} 
					}

					stream.next();
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
			var spaces = '';
			while (!stream.eol()) {
				switch (stream.next()) {
					case '/':
						if (stream.peek() == '*') {
							// multiline CSS comment
							stream.start = stream.pos - 1;
							if (stream.skipTo('*/')) {
								stream.pos += 2;
							} else {
								// unclosed comment
								stream.skipToEnd();
							}

							spaces = utils.repeatString(' ', stream.pos - stream.start);
							content = utils.replaceSubstring(content, spaces, stream.start, stream.pos);
						}
						break;
					// TODO: remove preprocessor comments
				}
			}

			return content;
		},

		/**
		 * Matches curly braces content right after given position
		 * @param  {String} content CSS content. Must not contain comments!
		 * @param  {Number} pos     Search start position
		 * @return {Range}
		 */
		matchBracesRanges: function(content, pos) {
			var stream = stringStream(content);
			stream.start = stream.pos = pos;
			var stack = [], ranges = [];
			while (!stream.eol()) {
				switch (stream.next()) {
					case '{':
						stack.push(stream.pos - 1);
						break;
					case '}':
						if (!stack.length) {
							throw 'Invalid source structure (check for curly braces)';
						}
						ranges.push(range.create2(stack.pop(), stream.pos));
						if (!stack.length) {
							return ranges;
						}
						break;
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
		 * @param  {Boolean} stripComments Strip comments from CSS source.
		 * Off by default and assumes that CSS must be comment-free already
		 * (for performance)
		 * @return {Range}
		 */
		extractSelector: function(content, pos, stripComments) {
			if (stripComments) {
				content = this.stripComments(content);
			}

			// find CSS selector
			var ch;
			var endPos = pos;
			while (--pos >= 0) {
				ch = content.charAt(pos);
				if (ch == '{' || ch == '}' || ch == ';') {
					pos++;
					break;
				}
			}

			if (pos < 0) {
				pos = 0;
			}
			
			var selector = content.substring(pos, endPos);
			// trim whitespace
			pos += selector.length - selector.replace(/^[\s\n\r]+/, '').length;
			endPos -= selector.length - selector.replace(/[\s\n\r]+$/, '').length;

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
				// we have a context rule but it may contain nested rules
				rules = _.filter(rules, function(r) {
					return ctxRule.contains(r);
				});

				// no nested rules
				if (!rules.length) {
					return ctxRule;
				}
			}

			for (var i = 0, il = rules.length; i < il; i++) {
				if (rules[i].start > pos) {
					return rules[isBackward ? i - 1 : i];
				}
			}
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
		}
	};
});