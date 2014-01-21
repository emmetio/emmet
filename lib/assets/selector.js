/**
 * Utility module for working with CSS selectors: parsing, splitting
 * comparing, etc.
 */
if (typeof module === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		module.exports = factory(require, exports, module);
	};
}

define(function(require, exports, module) {
	var _ = require('lodash');
	var utils = require('../utils/common');
	var commentsUtils = require('../utils/comments');
	var stringStream = require('./stringStream');

	var reComma = /,/;
	var reNameSeparator = /[>\+\~\s]/;
	var reNameModifiers = /[\.#%:]/;
	var reSelSpaces = /[ \t]+/g;

	function sanitize(sel) {
		return commentsUtils.strip( normalize(sel) );
	}

	function normalize(sel) {
		return utils.trim(sel).replace(reSelSpaces, ' ');
	}

	/**
	 * Normalizes attribute definition in given CSS definition
	 * @param  {String} attr
	 * @return {String}
	 */
	function normalizeAttribute(attr) {
		if (attr.charAt(0) == '[') {
			attr = stripped(attr);
		}

		attr = utils.trim(attr);
		return '[' + attr.replace(/^([\w\-]+)\s*(\W?=)\s*/, '$1$2') + ']';
	}

	/**
	 * Returns stripped string: a string without first and last character.
	 * Used for “unquoting” strings
	 * @param {String} str
	 * @returns {String}
	 */
	function stripped(str) {
		return str.substring(1, str.length - 1);
	}

	/**
	 * Compares two parsed selector values. The order of arguments is important:
	 * first must value from selector to extend, the second must be candidate
	 * to extend
	 * @param  {Object} inner
	 * @param  {Object} outer
	 * @return {Boolean}
	 */
	function matchesSelPart(inner, outer) {
		if (_.isArray(inner)) {
			for (var i = 0, il = inner.length; i < il; i++) {
				if (outer.indexOf(inner[0]) == -1) {
					return false;
				}
			}

			return true;
		}

		if (typeof inner == 'object') {
			for (var p in inner) {
				if (inner[p] != outer[p]) {
					return false;
				}
			}

			return true;
		}

		return inner == outer;
	}

	/**
	 * Simple factory method that returns Selector object
	 * for given argument
	 * @param  {Object} sel
	 * @return {Selector}
	 */
	function makeSelector(sel) {
		return (sel instanceof Selector) ? sel : new Selector(sel);
	}

	function makeSelectorPart(part) {
		return (part instanceof SelectorPart) ? part : new SelectorPart(part);
	}

	function Selector(sel, parts) {
		this._selector = sanitize(sel);
		this._parts = parts || null;
	}

	Selector.prototype = {
		/**
		 * Extracts parts from given selector. For example,
		 * in `#nav > li + a span` parts are: `[#nav, li, a, span]
		 * @return {Array}
		 */
		parts: function() {
			if (this._parts) {
				return this._parts;
			}
			
			var stream = stringStream(this._selector);
			var parts = [], ch;
			var add = function(part, start) {
				parts.push(new SelectorPart(part, start));
			};

			while (ch = stream.next()) {
				if (reNameSeparator.test(ch)) {
					add(stream.current(true), stream.start);
					stream.eatWhile(reNameSeparator);
					stream.start = stream.pos;
				} else if (ch == '[') {
					stream.backUp(1);
					stream.skipToPair('[', ']', true);
				}
			}

			add(stream.current(), stream.start);
			return this._parts = _.compact(parts);
		},

		clone: function() {
			return new Selector(this._selector, this._parts && this._parts.slice(0));
		},

		/**
		 * Check if current selector can extend given one
		 * @param  {Selector} sel
		 * @return {Boolean}
		 */
		canExtend: function(sel) {
			sel = makeSelector(sel);

			var curPart = this.parts()[0];
			var selParts = sel.parts();
			for (var i = 0, il = selParts.length; i < il; i++) {
				if (curPart.canExtend(selParts[i])) {
					return true;
				}
			}

			return false;
		},

		/**
		 * Returns string representation of current selector, extended
		 * with given one
		 * @param {Selector} sel Selector to extend with
		 * @param {SelectorPart} target Current selector sub-part that should be replaced with `sel`
		 * @return {String}
		 */
		extendedCopy: function(sel, target) {
			sel = makeSelector(sel);
			target = makeSelectorPart(target);
			var extended = this.copy();
			var selString = extended._selector;
			var replacementRanges = [];

			var parts = extended.parts();
			var selParts = sel.parts();
			for (var i = parts.length - 1, part, ex; i >= 0; i--) {
				part = parts[i];
				if (target.canExtend(part)) {
					ex = part.extendedCopy(selParts[0], target);
					ex.start = part.start;
					selString = utils.replaceSubstring(selString, ex, part.start, part.start + part.length());
					parts[i] = ex;
				}
			}

			extended._selector = selString;
			return extended;
		},

		valueOf: function() {
			return this._selector;
		},

		toString: function() {
			return this.valueOf();
		}
	};

	/**
	 * Parses given selector part into an object that can be 
	 * used for comparison
	 * @param {String} part
	 */
	function SelectorPart(part, start) {
		this._fragments = (typeof part == 'string') 
			? this._parse(part) 
			: part;

		this.start = typeof start !== 'undefined' ? start : -1;
	}

	SelectorPart.prototype = {
		_parse: function(part) {
			var out = [];
			var stream = stringStream(part), ch;
			while (ch = stream.next()) {
				if (reNameModifiers.test(ch)) {
					out.push(stream.current(true));
					stream.start = stream.pos - 1;
					if (ch == ':' && stream.peek() == ':') {
						stream.next();
					}
				} else if (ch == '[') {
					out.push(stream.current(true));
					// consume attribute set
					stream.backUp(1);
					stream.start = stream.pos;
					if (!stream.skipToPair('[', ']', true)) {
						break;
					}

					out.push(normalizeAttribute( stream.current() ))
					stream.start = stream.pos;
				}
			}

			out.push(stream.current());
			return _.compact(out);
		},
		/**
		 * Check if current part can extend given one
		 * @param  {SelectorPart}  sel
		 * @return {Boolean}
		 */
		canExtend: function(part) {
			part = makeSelectorPart(part);

			for (var i = 0, il = this._fragments.length; i < il; i++) {
				if (!_.include(part._fragments, this._fragments[i])) {
					return false;
				}
			}

			return true;
		},

		/**
		 * Creates copy of current part
		 * @return {SelectorPart}
		 */
		clone: function() {
			return new SelectorPart(this._fragments.slice(0));
		},

		/**
		 * Returns copy of current part with fragments from `part` removed
		 * @param  {SelectorPart} part
		 * @return {SelectorPart}
		 */
		copyWithRemovedFragments: function(part) {
			part = makeSelectorPart(part);
			var out = this.clone();
			var of = out._fragments;
			var pf = part._fragments;

			// remove target fragments & find best insertion point
			for (var i = 0, il = pf.length, ix; i < il; i++) {
				ix = _.indexOf(of, pf[i]);
				if (ix != -1) {
					of.splice(ix, 1);
				}
			}

			return out;
		},

		/**
		 * Returns "extended" version of current part:
		 * replaces `target` fragments in current part with ones in `part`
		 * @param {SelectorPart} part
		 * @param {SelectorPart} target
		 * @return {SelectorPart}
		 */
		extendedCopy: function(part, target) {
			part = makeSelectorPart(part).clone();
			var extended = this.copyWithRemovedFragments(target);
			var ef = extended._fragments;
			var pf = part._fragments;

			// basically, all we have to do is to append all fragments
			// from `part` to `extended`, but with one exception:
			// if part’s first fragment is element, we have to place
			// it *before* existing fragments
			if (/^[a-z\-_]/i.test(pf[0])) {
				ef.unshift(pf.shift());
			}

			extended._fragments = ef.concat(pf);
			return extended;
		},

		length: function() {
			return this.valueOf().length;
		},

		/**
		 * Creates string representation of current parsed selector part
		 * @param  {RegExp} skip Tokens matching this regexp will be skipped 
		 * from output
		 * @return {String}
		 */
		stringify: function(skip) {
			var fragments = this._fragments;
			if (skip) {
				fragments = _.filter(fragments, function(f) {
					return !skip.test(f);
				});
			}

			return fragments.join('');
		},

		valueOf: function() {
			return this.stringify();
		},

		toString: function() {
			return this.valueOf();
		}
	};

	return {
		/**
		 * Extracts rules, separated by comma, from
		 * given selector
		 * @param {String} selector
		 * @return {Array} Array of selector parts, normalized
		 */
		rules: function(selector, parse) {
			// looks like regexp works a little faster than indexOf()
			if (!reComma.test(selector)) {
				// nothing to split
				return [this.normalize(selector)];
			}

			selector = sanitize(selector);
			var stream = stringStream(selector), ch;
			var selectors = [];

			var add = parse
				? function(sel) {sel && selectors.push(new Selector(sel));}
				: function(sel) {selectors.push(normalize(sel));};

			while (ch = stream.next()) {
				if (ch == ',') {
					add(stream.current(true));
					stream.start = stream.pos;
				} else {
					stream.skipQuoted();
				}
			}

			add(stream.current());
			return _.compact(selectors);
		},

		/**
		 * Factory method that creates Selector instance from given
		 * selector string
		 * @param  {String} sel
		 * @return {Selector}
		 */
		create: makeSelector,

		/**
		 * Returns parts of given selector
		 * @param  {Selector} sel
		 * @return {Array}
		 */
		parts: function(sel) {
			return makeSelector(sel).parts();
		},

		/**
		 * Normalizes selector
		 * @param  {String} sel
		 * @return {String}
		 */
		normalize: normalize
	};
});