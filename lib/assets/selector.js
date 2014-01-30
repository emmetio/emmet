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
	var reName = /^[a-z\-_]/i;
	var reNameSeparator = /[>\+\~\s]/;
	var reNameModifiers = /[\.#%:]/;
	var reSelSpaces = /[ \t\n]+/g;

	function opt(options) {
		return options || {};
	}

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
	 * Check if given selector contains multiple definitions of
	 * fragments that should have only one occurence
	 * @param  {Selector} sel
	 * @return {Boolean}
	 */
	function hasMultipleDefs(sel) {
		var reDef = /^(#|::)/;
		var parts = sel.parts();
		var matched, part, m;
		for (var i = 0, il = parts.length; i < il; i++) {
			part = parts[i];
			matched = {};
			for (var j = 0, jl = part._fragments.length; j < jl; j++) {
				if (m = reDef.exec(part._fragments[j])) {
					if (matched[m[1]]) {
						return true;
					}
					matched[m[1]] = true;
				}
			}
		}
	}

	function unifyPart(part) {
		var stream = stringStream(part), ch;
		var out = '';
		while (ch = stream.next()) {
			if (ch == '[') {
				stream.backUp(1);
				stream.start = stream.pos;
				stream.skipToPair('[', ']', true);
				out += normalizeAttribute(stream.current());
			} else {
				out += ch;
			}
		}

		return out;
	}

	/**
	 * Extracts common prefix for given parts list and removes 
	 * it from passed arrays
	 * @param  {Array} parts
	 * @param  {Array} selParts
	 * @return {Array} Common prefix
	 */
	function extractCommonPrefix(parts1, parts2) {
		var commonParts = [];
		for (var i = 0, il = Math.min(parts1.length, parts2.length); i < il; i++) {
			if (parts1[0].equal(parts2[0])) {
				commonParts.push(parts2.shift());
				parts1.shift();
			} else {
				break;
			}
		}

		return commonParts;
	}

	/**
	 * Finds safe parts in given array. A safe part can be used for
	 * selector permutation
	 * @param  {Array} parts
	 * @return {Array}
	 */
	function findSafeParts(parts) {
		var safeParts = [];
		for (var i = 0, il = parts.length - 1; i < il; i++) {
			if (parts[i + 1] && parts[i + 1].op == ' ') {
				safeParts.push(parts[i]);
			} else {
				break;
			}
		}
		return safeParts;
	}

	/**
	 * Utility function that creates a copy of first
	 * part from given array that can be safely inserted into 
	 * the middle of selector (e.g. ensures that it contains operator)
	 * @param  {Array} parts
	 * @return {AelectorPart}
	 */
	function copyFirstPart(parts) {
		if (parts.length > 1) {
			var firstSelPart = parts[0].clone();
			firstSelPart.op = ' ';
			return firstSelPart;
		}
	}

	/**
	 * @param  {String} op
	 * @return {String}
	 */
	function normalizeOperator(op) {
		if (!op) {
			return '';
		}

		op = op.replace(/\s+/g, ' ');
		if (op !== ' ') {
			op = utils.trim(op);
		}

		return op;
	}

	function stringifyParts(parts) {
		var out = parts[0].valueOf();
		for (var i = 1, il = parts.length, p; i < il; i++) {
			p = parts[i];
			out += (p.op && p.op !== ' ' ? ' ' + p.op + ' ' : p.op) + p.valueOf();
		}
		return utils.trim(out);
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
		if (_.isArray(sel)) {
			this._parts = sel;
			this._selector = stringifyParts(sel);
		} else {
			this._selector = sanitize(sel);
			this._parts = parts || null;
		}
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
			var parts = [], op = '', ch;
			var add = function(part, op, start) {
				if (part) {
					parts.push(new SelectorPart(part, op, start));
				}
			};

			while (ch = stream.next()) {
				if (reNameSeparator.test(ch)) {
					add(stream.current(true), op, stream.start);
					stream.start = stream.pos - 1;
					stream.eatWhile(reNameSeparator);
					op = stream.current();
					stream.start = stream.pos;
				} else if (ch == '[') {
					stream.backUp(1);
					if (!stream.skipToPair('[', ']', true)) {
						break;
					}
				} else if (ch == '(') {
					stream.backUp(1);
					if (!stream.skipToPair('(', ')', true)) {
						break;
					}
				}
			}

			add(stream.current(), op, stream.start);
			return this._parts = parts;
		},

		clone: function() {
			return new Selector(this._selector, this._parts && this._parts.slice(0));
		},

		/**
		 * Check if current selector contains given part. 
		 * In other words, does current selector matches given extend target
		 * @param  {Selector} sel
		 * @return {Boolean}
		 */
		matchesPart: function(sel, extendWith, options) {
			sel = makeSelector(sel);
			if (extendWith) {
				extendWith = makeSelector(extendWith).parts()[0];
			}

			var testPart = sel.parts()[0];
			var selParts = this.parts();
			for (var i = 0, il = selParts.length; i < il; i++) {
				if (selParts[i].matches(testPart, extendWith, options)) {
					return true;
				}
			}

			return false;
		},

		/**
		 * Check if current selector completely includes given one.
		 * In other words, given selector is less specific but matches but both
		 * matches same element
		 * @param  {Selector} sel
		 * @return {Boolean}
		 */
		includes: function(sel) {
			var curParts = this.parts();
			var selParts = makeSelector(sel).parts();

			if (selParts.length > curParts.length) {
				return false;
			}

			for (var i = curParts.length - 1; i >= 0; i--) {
				if (!curParts[i].includes(selParts[i])) {
					return false;
				}
			};

			return true;
		},

		/**
		 * Returns copies of current selector, extended with given one
		 * @param {Selector} sel Selector to extend with
		 * @param {SelectorPart} target Current selector’s sub-part that should 
		 * be extended with `sel`
		 * @return {Array}
		 */
		extendedCopy: function(sel, target, options) {
			sel = makeSelector(sel);
			if (target instanceof Selector) {
				target = target.parts()[0];
			} else {
				target = makeSelectorPart(target);
			}
			
			var parts = this.parts().slice(0);
			var selParts = sel.parts().slice(0);
			var partToExtendWith = _.last(selParts);

			// Find common prefix for current and given selectors.
			// The rest parts can be used for building and permutating
			// selectors but common part should be the same
			var commonParts = extractCommonPrefix(parts, selParts);

			if (!parts.length || !selParts.length) {
				return null;
			}

			var firstSelPart = copyFirstPart(selParts);
			var safeParts = findSafeParts(selParts);

			var out = [], exPart, exParts, part;
			for (var il = parts.length - 1, i = il; i >= 0; i--) {
				part = parts[i];
				if (part.matches(target, selParts[0], options)) {
					exPart = part.extendedCopy(partToExtendWith, target, options);

					// to avoid excessive memory consumption,
					// I’m using a bit verbose version of array assembly
					exParts = i ? parts.slice(0, i) : [];
					for (var j = 0, jl = selParts.length - 1; j < jl; j++) {
						exParts.push(!j ? firstSelPart : selParts[j]);
					}

					if (exParts.length && !exPart.op) {
						exPart.op = ' ';
					}

					exParts.push(exPart);

					if (i !== il) {
						exParts.push.apply(exParts, parts.slice(i + 1));
					}

					out.push(new Selector([].concat(commonParts, exParts)));

					if (safeParts.length && i) {
						// have safe parts, permutate selector
						exParts = exParts.slice(0);
						exParts[0] = exParts[0].clone();
						exParts[0].op = ' ';
						exParts.splice(i, safeParts.length);
						out.push(new Selector( [].concat(commonParts, safeParts, exParts) ));
					}
				}
			}

			// keep unique selectors only
			var lookup = {};
			out = _.filter(out, function(sel) {
				var selStr = sel.toString();
				if (sel in lookup) {
					return false;
				}

				return lookup[sel] = true;
			});

			return out;
		},

		valueOf: function() {
			return stringifyParts(this.parts());
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
	function SelectorPart(part, op, start) {
		this.op = normalizeOperator(op);
		this._fragments = (typeof part == 'string') 
			? this._parse(part) 
			: part;

		this.start = typeof start !== 'undefined' ? start : -1;
	}

	SelectorPart.prototype = {
		_parse: function(part) {
			var out = [];
			part = unifyPart(part);
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

					// out.push(normalizeAttribute( stream.current() ))
					out.push(stream.current());
					stream.start = stream.pos;
				} else if (ch == '(') {
					stream.backUp(1);
					if (!stream.skipToPair('(', ')', true)) {
						throw new Error('Unable to parse ' + part);
					}
				}
			}

			out.push(stream.current());
			return _.compact(out);
		},

		fragments: function() {
			return this._fragments;
		},

		/**
		 * Check if given part matches current one
		 * @return {Boolean}
		 */
		matches: function(part, extendWith, options) {
			options = opt(options);
			part = makeSelectorPart(part);
			var op1 = this.op || ' ';
			var op2 = part.op || ' ';

			if (op1 != op2) {
				return false;
			}

			if (options.strictMatch) {
				return this.toString() === part.toString();
			}

			var cf = this.fragments();
			var pf = part.fragments();

			var name1 = reName.test(cf[0]) ? cf[0] : null;
			var name2 = reName.test(pf[0]) ? pf[0] : null;

			if (name2 && name1 !== name2) {
				return false;
			}

			// in LESS we don’t have such strict rules on selector matching
			if (name1 !== name2 && options.syntax == 'scss') {
				if (name1 && !name2 && extendWith) {
					// some weird behaviour or SCSS here: if target selector doesn’t
					// contains element name and current does, it can match selector
					// only if `extendWith` contains the same name
					var frags = extendWith.fragments();
					if (reName.test(frags[0]) && frags[0] !== name1) {
						return false;
					}
				} else {
					return false;
				}
			}

			for (var i = name2 ? 1 : 0, il = pf.length; i < il; i++) {
				if (!_.include(cf, pf[i])) {
					return false;
				}
			}

			return true;
		},

		/**
		 * Check if current part equals given one
		 * @param  {SelectorPart} part
		 * @return {Boolean}
		 */
		equal: function(part) {
			part = makeSelectorPart(part);
			return this.op === part.op && this.toString() === part.toString();
		},

		/**
		 * Creates copy of current part
		 * @return {SelectorPart}
		 */
		clone: function() {
			return new SelectorPart(this._fragments.slice(0), this.op);
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
			out._removedIx = null;

			// remove target fragments & find best insertion point
			for (var i = pf.length - 1, ix; i >= 0; i--) {
				ix = _.indexOf(of, pf[i]);
				if (ix != -1) {
					of.splice(ix, 1);
					out._removedIx = ix;
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
		extendedCopy: function(part, target, options) {
			options = opt(options);
			part = makeSelectorPart(part).clone();
			var extended = this.copyWithRemovedFragments(target);
			extended.op = part.op;
			var ef = extended._fragments;
			var pf = part._fragments;

			// basically, all we have to do is to append all fragments
			// from `part` to `extended`, but with one exception:
			// if part’s first fragment is element, we have to place
			// it *before* existing fragments
			if (reName.test(pf[0])) {
				if (reName.test(ef[0])) {
					ef[0] = pf.shift();
				} else {
					ef.unshift(pf.shift());
				}
			}

			// find best insertion point
			// in case we have pesuto-classes, insertion point should be right
			// before first pseudo-class
			// 
			// In LESS, target parts are replaced, in SCSS they are appended
			// to the end
			var insPos = extended._removedIx;
			if (insPos === null || options.syntax != 'less') {
				insPos = ef.length;
				for (var i = 0, il = ef.length; i < il; i++) {
					if (ef[i].charAt(0) == ':') {
						insPos = i;
						break;
					}
				}
			}


			// copy fragments into extended part 
			if (options.syntax == 'less') {
				// LESS doesn’t care about duplicates
				pf.forEach(function(f) {
					ef.splice(insPos++, 0, f);
				});
			} else {
				// skip duplicates for SCSS
				pf.forEach(function(f) {
					if (!_.include(ef, f)) {
						if (f.charAt(0) !== ':') {
							ef.splice(insPos++, 0, f);
						} else {
							ef.push(f);
						}
					}
				});
			}

			return extended.orderFragmens();
		},

		/**
		 * Orders fragments of current selector
		 */
		orderFragmens: function() {
			var rePseudoElement = /^::/;
			var rePseudoClass = /^:/;
			var rest = [], elems = [], classes = [];
			this._fragments.forEach(function(f) {
				if (rePseudoElement.test(f)) {
					elems.push(f);
				} else if (rePseudoClass.test(f)) {
					classes.push(f);
				} else {
					rest.push(f);
				}
			});

			this._fragments = rest.concat(classes, elems);
			return this;
		},

		includes: function(part) {
			var partFragments = makeSelectorPart(part)._fragments;
			var curFragments = this._fragments;
			for (var i = 0, il = partFragments.length; i < il; i++) {
				if (!_.include(curFragments, partFragments[i])) {
					return false;
				}
			}

			return true;
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
		 * Extracts rules, separated by comma, from given selector
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
				 if (ch == '(') {
					stream.backUp(1);
					if (!stream.skipToPair('(', ')', true)) {
						stream.backUp(-1);
						continue;
					}
				} else if (ch == '[') {
					stream.backUp(1);
					if (!stream.skipToPair('[', ']', true)) {
						stream.backUp(-1);
						continue;
					}
				} else  if (ch == ',') {
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
		 * If possible, creates extended copy of `selector` where
		 * part that matches `target` is replaced with `extendWith`
		 * @param  {Object} selector   Selector to extend.
		 * @param  {String} target     Fragment on `selector` that should be replaced
		 * @param  {String} extendWith Selector to extend with
		 * @return {Array}
		 */
		extend: function(selector, target, extendWith, options) {
			options = opt(options);
			if (!_.isArray(selector)) {
				selector = this.rules(selector, true);
			}

			target = makeSelector(target);
			extendWith = makeSelector(extendWith);

			// create lookup of existing selectors
			var lookup = {};
			_.each(selector, function(item) {
				lookup[item.toString()] = true;
			});

			var sel, extended, selectorCount = selector.length;
			for (var i = selectorCount - 1; i >= 0; i--) {
				selector[i] = makeSelector(selector[i]);
				sel = selector[i];
				if (sel.matchesPart(target, extendWith, options)) {
					extended = sel.extendedCopy(extendWith, target, options);
					if (!extended) {
						continue;
					}

					extended = _.filter(extended, function(exSel) {
						// selector contains multiple IDs: 
						// unlike SCSS, don’t fail here, simply skip extension
						if (hasMultipleDefs(exSel)) {
							return false;
						}

						// if `extend` produced the same selecor that already exists 
						// in selectors list (self-reference): skip it
						var strSel = exSel.toString();
						if (strSel in lookup) {
							return false;
						}

						lookup[strSel] = true;
						return true;
					});

					if (options.syntax == 'less') {
						// in LESS syntax extended selectors are appended to base ones
						_.each(extended, function(exSel) {
							selector.splice(selectorCount, 0, exSel);
						});
					} else {
						var j = i;
						_.each(extended, function(exSel) {
							// check edge case: if extended selector is less specific
							// than original one and they both match same element,
							// keep only extended one
							// if (sel.includes(exSel)) {
							// 	selector[i] = exSel;
							// } else {
							// 	selector.splice(++j, 0, exSel);
							// }
							selector.splice(++j, 0, exSel);
						});
					}
				}
			}

			return selector;
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