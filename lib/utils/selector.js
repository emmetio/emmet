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
	var utils = require('./common');
	var commentsUtils = require('./comments');
	var stringStream = require('../assets/stringStream');

	var reComma = /,/;
	var reNameSeparator = />\+\~\s/;
	var reNameModifiers = /\.#%/;
	var reSelSpaces = /[ \t]+/g;

	function sanitize(sel) {
		return commentsUtils.strip( utils.trim(sel) );
	}

	/**
	 * Removes opening and closing quotes from given string
	 * @param  {String} str
	 * @return {String}
	 */
	function unquote(str) {
		return str.replace(/^['"]|['"]$/g, '');
	}

	/**
	 * Splits attribute set into a list of attributes string
	 * @param  {String} attrSet 
	 * @return {Array}
	 */
	function splitAttributes(attrSet) {
		attrSet = utils.trim(attrSet);
		var parts = [];

		// split attribute set by spaces
		var stream = stringStream(attrSet), ch;
		while (ch = stream.next()) {
			if (ch == ' ') {
				parts.push(stream.current(true));
				stream.eatWhile(' ');
				stream.start = stream.pos;
			} else {
				stream.skipQuoted();
			}
		}

		parts.push(utils.trim(stream.current()));
		return parts;
	}

	/**
	 * Extract attributes and their values from attribute set: 
	 * <code>[attr col=3 title="Quoted string"]</code> (without square braces)
	 * @param {String} attrSet
	 * @returns {Array}
	 */
	function extractAttributes(attrSet) {
		var reAttrName = /^[\w\-:\$@]+\.?$/;
		var out = {};
		_.each(splitAttributes(attrSet), function(attr) {
			// attribute name: [attr]
			if (reAttrName.test(attr)) {
				out[attr] = null;
			} else if (~attr.indexOf('=')) {
				// attribute with value: [name=val], [name="val"]
				var parts = attr.split('=');
				out[parts.shift()] = unquote(parts.join('='));
			}
		});
		return out;
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

			parts.push(stream.current);
			return _.compact(parts);
		},

		/**
		 * Parses selector name token (for eaxmple, div#title.class.name) 
		 * into parts
		 * @param  {String} name Selector name token
		 * @return {Object}
		 */
		parse: function(sel) {
			var out = {};

			// extract name
			var name = null;
			sel = sel.replace(/^[\w\-]/, function(str) {
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
				}
			}

			pushModifier(lastModifier, stream.current());
			return out;
		},

		/**
		 * Normalizes selector
		 * @param  {String} sel
		 * @return {String}
		 */
		normalize: function(sel) {
			return utils.trim(sel).replace(reSelSpaces, ' ');
		}
	};
});