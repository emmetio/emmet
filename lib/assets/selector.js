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

	function Selector(sel) {
		this._rawSelector = sel;
		this._selector = sanitize(sel);
		this._parts = null;
		this._parsed = {};
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
			var add = function(part) {
				parts.push(new SelectorPart(part));
			};

			while (ch = stream.next()) {
				if (reNameSeparator.test(ch)) {
					add(stream.current(true));
					stream.eatWhile(reNameSeparator);
					stream.start = stream.pos;
				} else if (ch == '[') {
					stream.backUp(1);
					stream.skipToPair('[', ']', true);
				}
			}

			add(stream.current());
			return this._parts = _.compact(parts);
		},

		/**
		 * Check if current selector can extend given one
		 * @param  {Selector} sel
		 * @return {Boolean}
		 */
		canExtend: function(sel) {
			if (typeof sel == 'string') {
				sel = new Selector(sel);
			}

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
		 * @param {Selector} sel
		 * @return {String}
		 */
		extendWith: function(sel) {
			
		}
	};

	/**
	 * Parses given selector part into an object that can be 
	 * used for comparison
	 * @param {String} part
	 */
	function SelectorPart(part) {
		this._raw = part;
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
		this._fragments = _.compact(out);
	}

	SelectorPart.prototype = {
		/**
		 * Check if current part can extend given one
		 * @param  {SelectorPart}  sel
		 * @return {Boolean}
		 */
		canExtend: function(sel) {
			if (typeof sel == 'string') {
				sel = new SelectorPart(sel);
			}

			for (var i = 0, il = this._fragments.length; i < il; i++) {
				if (!_.include(sel._fragments, this._fragments[i])) {
					return false;
				}
			}

			return true;
		},

		/**
		 * Creates string representation of current parsed selector part
		 * @param  {RegExp} skip Tkens mathcing this regexp will be skiped 
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
		}
	};

	return {
		/**
		 * Extracts rules, separated by comma, from
		 * given selector
		 * @param {String} selector
		 * @return {Array} Array of selector parts, normalized
		 */
		rules: function(selector) {
			// looks like regexp works a little faster than indexOf()
			if (!reComma.test(selector)) {
				// nothing to split
				return [this.normalize(selector)];
			}

			selector = sanitize(selector);
			var stream = stringStream(selector), ch;
			var selectors = [];

			while (ch = stream.next()) {
				if (ch == ',') {
					selectors.push(this.normalize(stream.current(true)));
					stream.start = stream.pos;
				} else {
					stream.skipQuoted();
				}
			}

			selectors.push(this.normalize(stream.current()));
			return _.compact(selectors);
		},

		/**
		 * Extracts parts from given selector. For example,
		 * in `#nav > li + a span` parts are: `[#nav, li, a, span]
		 * @param  {String} selector
		 * @return {Array}
		 */
		parts: function(selector) {
			selector = sanitize(selector);
			var stream = stringStream(selector);
			var parts = [], ch;

			while (ch = stream.next()) {
				if (reNameSeparator.test(ch)) {
					parts.push(stream.current(true));
					stream.eatWhile(reNameSeparator);
					stream.start = stream.pos;
				} else if (ch == '[') {
					stream.backUp(1);
					stream.skipToPair('[', ']', true);
				}
			}

			parts.push(stream.current());
			return _.compact(parts);
		},

		/**
		 * Parses selector name token (for example, div#title.class.name) 
		 * into parts
		 * @param  {String} name Selector name token
		 * @return {Object}
		 */
		parse: function(sel) {
			var out = {};

			// extract name
			var name = null;
			sel = sel.replace(/^[\w\-]+/, function(str) {
				name = str;
				return '';
			});

			if (name) {
				out.name = name;
			}

			var pushModifier = function(mod, val) {
				if (mod && val) {
					if (!out[mod]) {
						out[mod] = [];
					}
					out[mod].push(val);
				}
			};

			var stream = stringStream(sel), ch;
			var lastModifier = null;
			while (ch = stream.next()) {
				if (reNameModifiers.test(ch)) {
					pushModifier(lastModifier, stream.current(true));
					stream.start = stream.pos;
					lastModifier = ch;
				} else if (ch == '[') {
					pushModifier(lastModifier, stream.current(true));
					// consume attribute set
					if (!out.attrs) {
						out.attrs = {};
					}

					stream.backUp(1);
					stream.start = stream.pos;
					if (!stream.skipToPair('[', ']', true)) {
						break;
					}

					_.extend(out.attrs, extractAttributes( stripped(stream.current()) ));
					stream.start = stream.pos;
				}
			}

			pushModifier(lastModifier, stream.current());
			return out;
		},

		/**
		 * Check if `inner` selector can extend `outer` one
		 * @param  {Oblect}  inner
		 * @param  {Oblect}  outer
		 * @return {Boolean}
		 */
		canExtend: function(inner, outer) {
			if (typeof inner == 'string') {
				inner = this.parse(inner);
			}
			if (typeof outer == 'string') {
				outer = this.parse(outer);
			}

			var keys = _.keys(inner);
			for (var i = 0, il = keys.length, p; i < il; i++) {
				p = keys[i];
				if (!(p in outer) || !matchesSelPart(inner[p], outer[p])) {
					return false;
				}
			}

			return true;
		},

		/**
		 * Normalizes selector
		 * @param  {String} sel
		 * @return {String}
		 */
		normalize: normalize
	};
});