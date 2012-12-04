/**
 * Resolver for fast CSS typing. Handles abbreviations with the following
 * notation:<br>
 *
 * <code>(-vendor prefix)?property(value)*(!)?</code>
 *
 * <br><br>
 * <b>Abbreviation handling</b><br>
 *
 * By default, Emmet searches for matching snippet definition for provided abbreviation.
 * If snippet wasn't found, Emmet automatically generates element with
 * abbreviation's name. For example, <code>foo</code> abbreviation will generate
 * <code>&lt;foo&gt;&lt;/foo&gt;</code> output.
 * <br><br>
 * This module will capture all expanded properties and upgrade them with values,
 * vendor prefixes and !important declarations. All unmatched abbreviations will
 * be automatically transformed into <code>property-name: ${1}</code> snippets.
 *
 * <b>Vendor prefixes<b><br>
 *
 * If CSS-property is preceded with dash, resolver should output property with
 * all <i>known</i> vendor prefixes. For example, if <code>brad</code>
 * abbreviation generates <code>border-radius: ${value};</code> snippet,
 * the <code>-brad</code> abbreviation should generate:
 * <pre><code>
 * -webkit-border-radius: ${value};
 * -moz-border-radius: ${value};
 * border-radius: ${value};
 * </code></pre>
 * Note that <i>o</i> and <i>ms</i> prefixes are omitted since Opera and IE
 * supports unprefixed property.<br><br>
 *
 * Users can also provide an explicit list of one-character prefixes for any
 * CSS property. For example, <code>-wm-float</code> will produce
 *
 * <pre><code>
 * -webkit-float: ${1};
 * -moz-float: ${1};
 * float: ${1};
 * </code></pre>
 *
 * Although this example looks pointless, users can use this feature to write
 * cutting-edge properties implemented by browser vendors recently.
 *
 * @constructor
 * @memberOf __cssResolverDefine
 * @param {Function} require
 * @param {Underscore} _
 */
emmet.define('cssResolver', function(require, _) {
	/** Back-reference to module */
	var module = null;

	var prefixObj = {
		/** Real vendor prefix name */
		prefix: 'emmet',

		/**
		 * Indicates this prefix is obsolete and should't be used when user
		 * wants to generate all-prefixed properties
		 */
		obsolete: false,

		/**
		 * Returns prefixed CSS property name
		 * @param {String} name Unprefixed CSS property
		 */
		transformName: function(name) {
			return '-' + this.prefix + '-' + name;
		},

		/**
		 * List of unprefixed CSS properties that supported by
		 * current prefix. This list is used to generate all-prefixed property
		 * @returns {Array}
		 */
		properties: function() {
			return getProperties('css.' + this.prefix + 'Properties') || [];
		},

		/**
		 * Check if given property is supported by current prefix
		 * @param name
		 */
		supports: function(name) {
			return _.include(this.properties(), name);
		}
	};


	/**
	 * List of registered one-character prefixes. Key is a one-character prefix,
	 * value is an <code>prefixObj</code> object
	 */
	var vendorPrefixes = {};

	var defaultValue = '${1};';

	// XXX module preferences
	var prefs = require('preferences');
	prefs.define('css.valueSeparator', ': ',
			'Defines a symbol that should be placed between CSS property and '
			+ 'value when expanding CSS abbreviations.');
	prefs.define('css.propertyEnd', ';',
			'Defines a symbol that should be placed at the end of CSS property  '
			+ 'when expanding CSS abbreviations.');

	prefs.define('stylus.valueSeparator', ' ',
			'Defines a symbol that should be placed between CSS property and '
			+ 'value when expanding CSS abbreviations in Stylus dialect.');
	prefs.define('stylus.propertyEnd', '',
			'Defines a symbol that should be placed at the end of CSS property  '
			+ 'when expanding CSS abbreviations in Stylus dialect.');

	prefs.define('sass.propertyEnd', '',
			'Defines a symbol that should be placed at the end of CSS property  '
			+ 'when expanding CSS abbreviations in SASS dialect.');

	prefs.define('css.autoInsertVendorPrefixes', true,
			'Automatically generate vendor-prefixed copies of expanded CSS '
			+ 'property. By default, Emmet will generate vendor-prefixed '
			+ 'properties only when you put dash before abbreviation '
			+ '(e.g. <code>-bxsh</code>). With this option enabled, you don’t '
			+ 'need dashes before abbreviations: Emmet will produce '
			+ 'vendor-prefixed properties for you.');

	var descTemplate = _.template('A comma-separated list of CSS properties that may have '
		+ '<code><%= vendor %></code> vendor prefix. This list is used to generate '
		+ 'a list of prefixed properties when expanding <code>-property</code> '
		+ 'abbreviations. Empty list means that all possible CSS values may '
		+ 'have <code><%= vendor %></code> prefix.');

	var descAddonTemplate = _.template('A comma-separated list of <em>additional</em> CSS properties '
			+ 'for <code>css.<%= vendor %>Preperties</code> preference. '
			+ 'You should use this list if you want to add or remove a few CSS '
			+ 'properties to original set. To add a new property, simply write its name, '
			+ 'to remove it, precede property with hyphen.<br>'
			+ 'For example, to add <em>foo</em> property and remove <em>border-radius</em> one, '
			+ 'the preference value will look like this: <code>foo, -border-radius</code>.');

	// properties list is created from cssFeatures.html file
	var props = {
		'webkit': 'align-content, align-items, align-self, animation, animation-delay, animation-direction, animation-duration, animation-fill-mode, animation-iteration-count, animation-name, animation-play-state, animation-timing-function, app-region, appearance, aspect-ratio, backface-visibility, background-clip, background-composite, background-origin, blend-mode, border-after, border-after-color, border-after-style, border-after-width, border-before, border-before-color, border-before-style, border-before-width, border-bottom-left-radius, border-bottom-right-radius, border-end, border-end-color, border-end-style, border-end-width, border-fit, border-horizontal-spacing, border-image, border-radius, border-start, border-start-color, border-start-style, border-start-width, border-top-left-radius, border-top-right-radius, border-vertical-spacing, box-align, box-decoration-break, box-direction, box-flex, box-flex-group, box-lines, box-ordinal-group, box-orient, box-pack, box-reflect, box-shadow, box-sizing, color-correction, column-axis, column-break-after, column-break-before, column-break-inside, column-count, column-gap, column-progression, column-rule, column-rule-color, column-rule-style, column-rule-width, column-span, column-width, columns, dashboard-region, flex, flex-basis, flex-direction, flex-flow, flex-grow, flex-shrink, flex-wrap, flow-from, flow-intro, font-feature-settings, font-kerning, font-size-delta, font-smoothing, font-variant-ligatures, grid-column, grid-columns, grid-row, grid-rows, highlight, hyphenate-character, hyphenate-limit-after, hyphenate-limit-before, hyphenate-limit-lines, hyphens, justify-content, line-align, line-box-contain, line-break, line-clamp, line-grid, line-snap, locale, logical-height, logical-width, margin-after, margin-after-collapse, margin-before, margin-before-collapse, margin-bottom-collapse, margin-collapse, margin-end, margin-start, margin-top-collapse, marquee, marquee-direction, marquee-increment, marquee-repetition, marquee-speed, marquee-style, mask, mask-attachment, mask-box-image, mask-box-image-outset, mask-box-image-repeat, mask-box-image-slice, mask-box-image-source, mask-box-image-width, mask-clip, mask-composite, mask-image, mask-origin, mask-position, mask-position-x, mask-position-y, mask-repeat, mask-repeat-x, mask-repeat-y, mask-size, match-nearest-mail-blockquote-color, max-logical-height, max-logical-width, min-logical-height, min-logical-width, nbsp-mode, order, overflow-scrolling, padding-after, padding-before, padding-end, padding-start, perspective, perspective-origin, perspective-origin-x, perspective-origin-y, print-color-adjust, region-overflow, region-break-after, region-break-before, region-break-inside, rtl-ordering, shape-inside, shape-outide, svg-shadow, tap-highlight-color, text-combine, text-decoration-line, text-decorations-in-effect, text-emphasis, text-emphasis-color, text-emphasis-position, text-emphasis-style, text-fill-color, text-orientation, text-security, text-size-adjust, text-stroke, text-stroke-color, text-stroke-width, touch-callout, transform, transform-origin, transform-origin-x, transform-origin-y, transform-origin-z, transform-style, transition, transition-delay, transition-duration, transition-property, transition-timing-function, user-drag, user-modify, user-select, wrap, wrap-flow, wrap-margin, wrap-padding, wrap-through, writing-mode',
		'moz': 'align-content, align-items, align-self, animation, animation-delay, animation-direction, animation-duration, animation-fill-mode, animation-iteration-count, animation-name, animation-play-state, animation-timing-function, appearance, backface-visibility, background-clip, background-inline-policy, background-origin, binding, border-bottom-colors, border-end, border-end-color, border-end-style, border-end-width, border-image, border-left-colors, border-right-colors, border-start, border-start-color, border-start-style, border-start-width, border-top-colors, box-align, box-direction, box-flex, box-float-edge, box-force-broken-image-icon, box-ordinal-group, box-orient, box-pack, box-sizing, column-count, column-fill, column-gap, column-rule, column-rule-color, column-rule-style, column-rule-width, column-width, columns, font-feature-settings, font-language-override, hyphens, image-region, margin-end, margin-start, orient, outline-radius, outline-radius-bottomleft, outline-radius-bottomright, outline-radius-topleft, outline-radius-topright, padding-end, padding-start, perspective, perspective-origin, script-level, script-min-size, script-size-multiplier, stack-sizing, tab-size, text-align-last, text-blink, text-decoration-color, text-decoration-line, transform, transform-origin, transform-style, transition, transition-delay, transition-duration, transition-property, transition-timing-function, unicode-bidi, user-focus, user-input, user-modify, user-select, window-shadow',
		'ms': 'accelerator, background-position-x, background-position-y, behavior, block-progression, content-zoom-chaining, content-zoom-limit, content-zoom-limit-max, content-zoom-limit-min, content-zoom-snap, content-zoom-snap-points, content-zoom-snap-type, content-zooming, filter, flex, flex-align, flex-direction, flex-order, flex-pack, flex-wrap, flow-from, flow-intro, grid-column, grid-column-align, grid-column-span, grid-columns, grid-row, grid-row-align, grid-row-span, grid-rows, high-contrast-adjust, hyphenate-limit-chars, hyphenate-limit-lines, hyphenate-limit-zone, hyphens, interpolation-mode, layout-flow,layout-grid, layout-grid-char, layout-grid-line, layout-grid-mode, layout-grid-type, line-break, overflow-style, overflow-x, overflow-y, progress-appearance, scrollbar-3dlight-color, scroll-chaining, scroll-limit, scroll-limit-x-max, scroll-limit-x-min, scroll-limit-y-max, scroll-limit-y-min, scroll-rails, scroll-snap-points-x, scroll-snap-points-y, scroll-snap-type, scroll-snap-x, scroll-snap-y, scroll-translation, scrollbar-arrow-color, scrollbar-base-color, scrollbar-darkshadow-color, scrollbar-face-color, scrollbar-highlight-color, scrollbar-shadow-color, scrollbar-track-color, text-align-last, text-autospace, text-justify, text-kashida-space, text-overflow, text-underline-position, touch-action, transform, transform-origin, user-select, wrap-flow, wrap-margin, wrap-through, writing-mode',
		'o': 'align-content, align-items, align-self, animation, animation-delay, animation-direction, animation-duration, animation-fill-mode, animation-iteration-count, animation-name, animation-play-state, animation-timing-function, border-image, device-pixel-ratio, object-fit, object-position, tab-size, table-baseline, transform, transform-origin, transition, transition-delay, transition-duration, transition-property, transition-timing-function'
	};

	_.each(props, function(v, k) {
		prefs.define('css.' + k + 'Properties', v, descTemplate({vendor: k}));
		prefs.define('css.' + k + 'PropertiesAddon', '', descAddonTemplate({vendor: k}));
	});

	prefs.define('css.unitlessProperties', 'z-index, line-height, opacity, font-weight, zoom',
			'The list of properties whose values ​​must not contain units.');

	prefs.define('css.intUnit', 'px', 'Default unit for integer values');
	prefs.define('css.floatUnit', 'em', 'Default unit for float values');

	prefs.define('css.keywords', 'auto, inherit',
			'A comma-separated list of valid keywords that can be used in CSS abbreviations.');

	prefs.define('css.keywordAliases', 'a:auto, i:inherit, s:solid, da:dashed, do:dotted',
			'A comma-separated list of keyword aliases, used in CSS abbreviation. '
			+ 'Each alias should be defined as <code>alias:keyword_name</code>.');

	prefs.define('css.unitAliases', 'e:em, p:%, x:ex, r:rem',
			'A comma-separated list of unit aliases, used in CSS abbreviation. '
			+ 'Each alias should be defined as <code>alias:unit_value</code>.');

	prefs.define('css.color.short', true,
			'Should color values like <code>#ffffff</code> be shortened to '
			+ '<code>#fff</code> after abbreviation with color was expanded.');

	prefs.define('css.color.case', 'keep',
			'Letter case of color values generated by abbreviations with color '
			+ '(like <code>c#0</code>). Possible values are <code>upper</code>, '
			+ '<code>lower</code> and <code>keep</code>.');

	prefs.define('css.fuzzySearch', true,
			'Enable fuzzy search among CSS snippet names. When enabled, every '
			+ '<em>unknown</em> snippet will be scored against available snippet '
			+ 'names (not values or CSS properties!). The match with best score '
			+ 'will be used to resolve snippet value. For example, with this '
			+ 'preference enabled, the following abbreviations are equal: '
			+ '<code>ov:h</code> == <code>ov-h</code> == <code>o-h</code> == '
			+ '<code>oh</code>');

	prefs.define('css.fuzzySearchMinScore', 0.3,
			'The minium score (from 0 to 1) that fuzzy-matched abbreviation should '
			+ 'achive. Lower values may produce many false-positive matches, '
			+ 'higher values may reduce possible matches.');


	function isNumeric(ch) {
		var code = ch && ch.charCodeAt(0);
		return (ch && ch == '.' || (code > 47 && code < 58));
	}

	/**
	 * Check if provided snippet contains only one CSS property and value.
	 * @param {String} snippet
	 * @returns {Boolean}
	 */
	function isSingleProperty(snippet) {
		var utils = require('utils');
		snippet = utils.trim(snippet);

		// check if it doesn't contain a comment and a newline
		if (~snippet.indexOf('/*') || /[\n\r]/.test(snippet)) {
			return false;
		}

		// check if it's a valid snippet definition
		if (!/^[a-z0-9\-]+\s*\:/i.test(snippet)) {
			return false;
		}

		snippet = require('tabStops').processText(snippet, {
			replaceCarets: true,
			tabstop: function() {
				return 'value';
			}
		});

		return snippet.split(':').length == 2;
	}

	/**
	 * Normalizes abbreviated value to final CSS one
	 * @param {String} value
	 * @returns {String}
	 */
	function normalizeValue(value) {
		if (value.charAt(0) == '-' && !/^\-[\.\d]/) {
			value = value.replace(/^\-+/, '');
		}

		if (value.charAt(0) == '#') {
			return normalizeHexColor(value);
		}

		return getKeyword(value);
	}

	function normalizeHexColor(value) {
		var hex = value.replace(/^#+/, '');
		var repeat = require('utils').repeatString;
		var color = null;
		switch (hex.length) {
			case 1:
				color = repeat(hex, 6);
				break;
			case 2:
				color = repeat(hex, 3);
				break;
			case 3:
				color = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
				break;
			case 4:
				color = hex + hex.substr(0, 2);
				break;
			case 5:
				color = hex + hex.charAt(0);
				break;
			default:
				color = hex.substr(0, 6);
		}

		// color must be shortened?
		if (prefs.get('css.color.short')) {
			var p = color.split('');
			if (p[0] == p[1] && p[2] == p[3] && p[4] == p[5]) {
				color = p[0] + p[2] + p[4];
			}
		}

		// should transform case?
		switch (prefs.get('css.color.case')) {
			case 'upper':
				color = color.toUpperCase();
				break;
			case 'lower':
				color = color.toLowerCase();
				break;
		}

		return '#' + color;
	}

	function getKeyword(name) {
		var aliases = prefs.getDict('css.keywordAliases');
		return name in aliases ? aliases[name] : name;
	}

	function getUnit(name) {
		var aliases = prefs.getDict('css.unitAliases');
		return name in aliases ? aliases[name] : name;
	}

	function isValidKeyword(keyword) {
		return _.include(prefs.getArray('css.keywords'), getKeyword(keyword));
	}

	/**
	 * Split snippet into a CSS property-value pair
	 * @param {String} snippet
	 */
	function splitSnippet(snippet) {
		var utils = require('utils');
		snippet = utils.trim(snippet);
		if (snippet.indexOf(':') == -1) {
			return {
				name: snippet,
				value: defaultValue
			};
		}

		var pair = snippet.split(':');

		return {
			name: utils.trim(pair.shift()),
			// replace ${0} tabstop to produce valid vendor-prefixed values
			// where possible
			value: utils.trim(pair.join(':')).replace(/^(\$\{0\}|\$0)(\s*;?)$/, '${1}$2')
		};
	}

	/**
	 * Check if passed CSS property support specified vendor prefix
	 * @param {String} property
	 * @param {String} prefix
	 */
	function hasPrefix(property, prefix) {
		var info = vendorPrefixes[prefix];

		if (!info)
			info = _.find(vendorPrefixes, function(data) {
				return data.prefix == prefix;
			});

		return info && info.supports(property);
	}

	/**
	 * Search for a list of supported prefixes for CSS property. This list
	 * is used to generate all-prefixed snippet
	 * @param {String} property CSS property name
	 * @returns {Array}
	 */
	function findPrefixes(property, noAutofill) {
		var result = [];
		_.each(vendorPrefixes, function(obj, prefix) {
			if (hasPrefix(property, prefix)) {
				result.push(prefix);
			}
		});

		if (!result.length && !noAutofill) {
			// add all non-obsolete prefixes
			_.each(vendorPrefixes, function(obj, prefix) {
				if (!obj.obsolete)
					result.push(prefix);
			});
		}

		return result;
	}

	function addPrefix(name, obj) {
		if (_.isString(obj))
			obj = {prefix: obj};

		vendorPrefixes[name] = _.extend({}, prefixObj, obj);
	}

	function getSyntaxPreference(name, syntax) {
		if (syntax) {
			var val = prefs.get(syntax + '.' + name);
			if (!_.isUndefined(val))
				return val;
		}

		return prefs.get('css.' + name);
	}

	/**
	 * Format CSS property according to current syntax dialect
	 * @param {String} property
	 * @param {String} syntax
	 * @returns {String}
	 */
	function formatProperty(property, syntax) {
		var ix = property.indexOf(':');
		property = property.substring(0, ix).replace(/\s+$/, '')
			+ getSyntaxPreference('valueSeparator', syntax)
			+ require('utils').trim(property.substring(ix + 1));

		return property.replace(/\s*;\s*$/, getSyntaxPreference('propertyEnd', syntax));
	}

	/**
	 * Transforms snippet value if required. For example, this transformation
	 * may add <i>!important</i> declaration to CSS property
	 * @param {String} snippet
	 * @param {Boolean} isImportant
	 * @returns {String}
	 */
	function transformSnippet(snippet, isImportant, syntax) {
		if (!_.isString(snippet))
			snippet = snippet.data;

		if (!isSingleProperty(snippet))
			return snippet;

		if (isImportant) {
			if (~snippet.indexOf(';')) {
				snippet = snippet.split(';').join(' !important;');
			} else {
				snippet += ' !important';
			}
		}

		return formatProperty(snippet, syntax);
	}

	/**
	 * Helper function that parses comma-separated list of elements into array
	 * @param {String} list
	 * @returns {Array}
	 */
	function parseList(list) {
		var result = _.map((list || '').split(','), require('utils').trim);
		return result.length ? result : null;
	}

	function getProperties(key) {
		var list = prefs.getArray(key);
		_.each(prefs.getArray(key + 'Addon'), function(prop) {
			if (prop.charAt(0) == '-') {
				list = _.without(list, prop.substr(1));
			} else {
				if (prop.charAt(0) == '+')
					prop = prop.substr(1);

				list.push(prop);
			}
		});

		return list;
	}


	// TODO refactor, this looks awkward now
	addPrefix('w', {
		prefix: 'webkit'
	});
	addPrefix('m', {
		prefix: 'moz'
	});
	addPrefix('s', {
		prefix: 'ms'
	});
	addPrefix('o', {
		prefix: 'o'
	});

	// I think nobody uses it
//	addPrefix('k', {
//		prefix: 'khtml',
//		obsolete: true
//	});

	var cssSyntaxes = ['css', 'less', 'sass', 'scss', 'stylus'];

	/**
	 * XXX register resolver
	 * @param {TreeNode} node
	 * @param {String} syntax
	 */
	require('resources').addResolver(function(node, syntax) {
		if (_.include(cssSyntaxes, syntax) && node.isElement()) {
			return module.expandToSnippet(node.abbreviation, syntax);
		}

		return null;
	});

	var ea = require('expandAbbreviation');
	/**
	 * For CSS-like syntaxes, we need to handle a special use case. Some editors
	 * (like Sublime Text 2) may insert semicolons automatically when user types
	 * abbreviation. After expansion, user receives a double semicolon. This
	 * handler automatically removes semicolon from generated content in such cases.
	 * @param {IEmmetEditor} editor
	 * @param {String} syntax
	 * @param {String} profile
	 */
	ea.addHandler(function(editor, syntax, profile) {
		if (!_.include(cssSyntaxes, syntax)) {
			return false;
		}

		var caretPos = editor.getSelectionRange().end;
		var abbr = ea.findAbbreviation(editor);

		if (abbr) {
			var content = emmet.expandAbbreviation(abbr, syntax, profile);
			if (content) {
				var replaceFrom = caretPos - abbr.length;
				var replaceTo = caretPos;
				if (editor.getContent().charAt(caretPos) == ';' && content.charAt(content.length - 1) == ';') {
					replaceTo++;
				}

				editor.replaceContent(content, replaceFrom, replaceTo);
				return true;
			}
		}

		return false;
	});

	return module = {
		/**
		 * Adds vendor prefix
		 * @param {String} name One-character prefix name
		 * @param {Object} obj Object describing vendor prefix
		 * @memberOf cssResolver
		 */
		addPrefix: addPrefix,

		/**
		 * Check if passed CSS property supports specified vendor prefix
		 * @param {String} property
		 * @param {String} prefix
		 */
		supportsPrefix: hasPrefix,

		/**
		 * Returns prefixed version of passed CSS property, only if this
		 * property supports such prefix
		 * @param {String} property
		 * @param {String} prefix
		 * @returns
		 */
		prefixed: function(property, prefix) {
			return hasPrefix(property, prefix)
				? '-' + prefix + '-' + property
				: property;
		},

		/**
		 * Returns list of all registered vendor prefixes
		 * @returns {Array}
		 */
		listPrefixes: function() {
			return _.map(vendorPrefixes, function(obj) {
				return obj.prefix;
			});
		},

		/**
		 * Returns object describing vendor prefix
		 * @param {String} name
		 * @returns {Object}
		 */
		getPrefix: function(name) {
			return vendorPrefixes[name];
		},

		/**
		 * Removes prefix object
		 * @param {String} name
		 */
		removePrefix: function(name) {
			if (name in vendorPrefixes)
				delete vendorPrefixes[name];
		},

		/**
		 * Extract vendor prefixes from abbreviation
		 * @param {String} abbr
		 * @returns {Object} Object containing array of prefixes and clean
		 * abbreviation name
		 */
		extractPrefixes: function(abbr) {
			if (abbr.charAt(0) != '-') {
				return {
					property: abbr,
					prefixes: null
				};
			}

			// abbreviation may either contain sequence of one-character prefixes
			// or just dash, meaning that user wants to produce all possible
			// prefixed properties
			var i = 1, il = abbr.length, ch;
			var prefixes = [];

			while (i < il) {
				ch = abbr.charAt(i);
				if (ch == '-') {
					// end-sequence character found, stop searching
					i++;
					break;
				}

				if (ch in vendorPrefixes) {
					prefixes.push(ch);
				} else {
					// no prefix found, meaning user want to produce all
					// vendor-prefixed properties
					prefixes.length = 0;
					i = 1;
					break;
				}

				i++;
			}

			// reached end of abbreviation and no property name left
			if (i == il -1) {
				i = 1;
				prefixes.length = 1;
			}

			return {
				property: abbr.substring(i),
				prefixes: prefixes.length ? prefixes : 'all'
			};
		},

		/**
		 * Search for value substring in abbreviation
		 * @param {String} abbr
		 * @returns {String} Value substring
		 */
		findValuesInAbbreviation: function(abbr, syntax) {
			syntax = syntax || 'css';

			var i = 0, il = abbr.length, value = '', ch;
			while (i < il) {
				ch = abbr.charAt(i);
				if (isNumeric(ch) || ch == '#' || (ch == '-' && isNumeric(abbr.charAt(i + 1)))) {
					value = abbr.substring(i);
					break;
				}

				i++;
			}

			// try to find keywords in abbreviation
			var property = abbr.substring(0, abbr.length - value.length);
			var res = require('resources');
			var keywords = [];
			// try to extract some commonly-used properties
			while (~property.indexOf('-') && !res.findSnippet(syntax, property)) {
				var parts = property.split('-');
				var lastPart = parts.pop();
				if (!isValidKeyword(lastPart)) {
					break;
				}

				keywords.unshift(lastPart);
				property = parts.join('-');
			}

			return keywords.join('-') + value;
		},

		parseValues: function(str) {
			/** @type StringStream */
			var stream = require('stringStream').create(str);
			var values = [];
			var ch = null;

			while (ch = stream.next()) {
				if (ch == '#') {
					stream.match(/^[0-9a-f]+/, true);
					values.push(stream.current());
				} else if (ch == '-') {
					if (isValidKeyword(_.last(values)) ||
							( stream.start && isNumeric(str.charAt(stream.start - 1)) )
						) {
						stream.start = stream.pos;
					}

					stream.match(/^\-?[0-9]*(\.[0-9]+)?[a-z\.]*/, true);
					values.push(stream.current());
				} else {
					stream.match(/^[0-9]*(\.[0-9]+)?[a-z]*/, true);
					values.push(stream.current());
				}

				stream.start = stream.pos;
			}

			return _.map(_.compact(values), normalizeValue);
		},

		/**
		 * Extracts values from abbreviation
		 * @param {String} abbr
		 * @returns {Object} Object containing array of values and clean
		 * abbreviation name
		 */
		extractValues: function(abbr) {
			// search for value start
			var abbrValues = this.findValuesInAbbreviation(abbr);
			if (!abbrValues) {
				return {
					property: abbr,
					values: null
				};
			}

			return {
				property: abbr.substring(0, abbr.length - abbrValues.length).replace(/-$/, ''),
				values: this.parseValues(abbrValues)
			};
		},

		/**
		 * Normalizes value, defined in abbreviation.
		 * @param {String} value
		 * @param {String} property
		 * @returns {String}
		 */
		normalizeValue: function(value, property) {
			property = (property || '').toLowerCase();
			var unitlessProps = prefs.getArray('css.unitlessProperties');
			return value.replace(/^(\-?[0-9\.]+)([a-z]*)$/, function(str, val, unit) {
				if (!unit && (val == '0' || _.include(unitlessProps, property)))
					return val;

				if (!unit)
					return val + prefs.get(~val.indexOf('.') ? 'css.floatUnit' : 'css.intUnit');

				return val + getUnit(unit);
			});
		},

		/**
		 * Expands abbreviation into a snippet
		 * @param {String} abbr Abbreviation name to expand
		 * @param {String} value Abbreviation value
		 * @param {String} syntax Currect syntax or dialect. Default is 'css'
		 * @returns {Object} Array of CSS properties and values or predefined
		 * snippet (string or element)
		 */
		expand: function(abbr, value, syntax) {
			syntax = syntax || 'css';
			var resources = require('resources');
			var autoInsertPrefixes = prefs.get('css.autoInsertVendorPrefixes');

			// check if snippet should be transformed to !important
			var isImportant;
			if (isImportant = /^(.+)\!$/.test(abbr)) {
				abbr = RegExp.$1;
			}

			// check if we have abbreviated resource
			var snippet = resources.findSnippet(syntax, abbr);
			if (snippet && !autoInsertPrefixes) {
				return transformSnippet(snippet, isImportant, syntax);
			}

			// no abbreviated resource, parse abbreviation
			var prefixData = this.extractPrefixes(abbr);
			var valuesData = this.extractValues(prefixData.property);
			var abbrData = _.extend(prefixData, valuesData);

			snippet = resources.findSnippet(syntax, abbrData.property);

			// fallback to some old snippets like m:a
//			if (!snippet && ~abbrData.property.indexOf(':')) {
//				var parts = abbrData.property.split(':');
//				var propertyName = parts.shift();
//				snippet = resources.findSnippet(syntax, propertyName) || propertyName;
//				abbrData.values = this.parseValues(parts.join(':'));
//			}

			if (!snippet && prefs.get('css.fuzzySearch')) {
				// let’s try fuzzy search
				snippet = resources.fuzzyFindSnippet(syntax, abbrData.property, parseFloat(prefs.get('css.fuzzySearchMinScore')));
			}

			if (!snippet) {
				snippet = abbrData.property + ':' + defaultValue;
			} else if (!_.isString(snippet)) {
				snippet = snippet.data;
			}

			if (!isSingleProperty(snippet)) {
				return snippet;
			}

			var snippetObj = splitSnippet(snippet);
			var result = [];
			if (!value && abbrData.values) {
				value = _.map(abbrData.values, function(val) {
					return this.normalizeValue(val, snippetObj.name);
				}, this).join(' ') + ';';
			}

			snippetObj.value = value || snippetObj.value;

			var prefixes = abbrData.prefixes == 'all' || (!abbrData.prefixes && autoInsertPrefixes)
				? findPrefixes(snippetObj.name, autoInsertPrefixes && abbrData.prefixes != 'all')
				: abbrData.prefixes;

			_.each(prefixes, function(p) {
				if (p in vendorPrefixes) {
					result.push(transformSnippet(
							vendorPrefixes[p].transformName(snippetObj.name)
							+ ':' + snippetObj.value,
							isImportant, syntax));

				}
			});

			// put the original property
			result.push(transformSnippet(snippetObj.name + ':' + snippetObj.value, isImportant, syntax));

			return result;
		},

		/**
		 * Same as <code>expand</code> method but transforms output into
		 * Emmet snippet
		 * @param {String} abbr
		 * @param {String} syntax
		 * @returns {String}
		 */
		expandToSnippet: function(abbr, syntax) {
			var snippet = this.expand(abbr, null, syntax);
			if (_.isArray(snippet)) {
				return snippet.join('\n');
			}

			if (!_.isString(snippet))
				return snippet.data;

			return String(snippet);
		},

		getSyntaxPreference: getSyntaxPreference,
		transformSnippet: transformSnippet
	};
});
