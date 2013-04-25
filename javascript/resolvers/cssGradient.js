/**
 * 'Expand Abbreviation' handler that parses gradient definition from under 
 * cursor and updates CSS rule with vendor-prefixed values.
 * 
 * @memberOf __cssGradientHandlerDefine
 * @param {Function} require
 * @param {Underscore} _
 */
emmet.define('cssGradient', function(require, _) {
	var defaultLinearDirections = ['top', 'to bottom', '0deg'];
	/** Back-reference to current module */
	var module = null;
	
	var cssSyntaxes = ['css', 'less', 'sass', 'scss', 'stylus', 'styl'];
	
	var reDeg = /\d+deg/i;
	var reKeyword = /top|bottom|left|right/i;
	
	// XXX define preferences
	/** @type preferences */
	var prefs = require('preferences');
	prefs.define('css.gradient.prefixes', 'webkit, moz, o',
			'A comma-separated list of vendor-prefixes for which values should ' 
			+ 'be generated.');
	
	prefs.define('css.gradient.oldWebkit', true,
			'Generate gradient definition for old Webkit implementations');
	
	prefs.define('css.gradient.omitDefaultDirection', true,
		'Do not output default direction definition in generated gradients.');
	
	prefs.define('css.gradient.defaultProperty', 'background-image',
		'When gradient expanded outside CSS value context, it will produce '
			+ 'properties with this name.');
	
	prefs.define('css.gradient.fallback', false,
			'With this option enabled, CSS gradient generator will produce '
			+ '<code>background-color</code> property with gradient first color '
			+ 'as fallback for old browsers.');
	
	function normalizeSpace(str) {
		return require('utils').trim(str).replace(/\s+/g, ' ');
	}
	
	/**
	 * Parses linear gradient definition
	 * @param {String}
	 */
	function parseLinearGradient(gradient) {
		var direction = defaultLinearDirections[0];
		
		// extract tokens
		/** @type StringStream */
		var stream = require('stringStream').create(require('utils').trim(gradient));
		var colorStops = [], ch;
		while ((ch = stream.next())) {
			if (stream.peek() == ',') {
				colorStops.push(stream.current());
				stream.next();
				stream.eatSpace();
				stream.start = stream.pos;
			} else if (ch == '(') { // color definition, like 'rgb(0,0,0)'
				stream.skipTo(')');
			}
		}
		
		// add last token
		colorStops.push(stream.current());
		colorStops = _.compact(_.map(colorStops, normalizeSpace));
		
		if (!colorStops.length)
			return null;
		
		// let's see if the first color stop is actually a direction
		if (reDeg.test(colorStops[0]) || reKeyword.test(colorStops[0])) {
			direction = colorStops.shift();
		}
		
		return {
			type: 'linear',
			direction: direction,
			colorStops: _.map(colorStops, parseColorStop)
		};
	}
	
	/**
	 * Parses color stop definition
	 * @param {String} colorStop
	 * @returns {Object}
	 */
	function parseColorStop(colorStop) {
		colorStop = normalizeSpace(colorStop);
		
		// find color declaration
		// first, try complex color declaration, like rgb(0,0,0)
		var color = null;
		colorStop = colorStop.replace(/^(\w+\(.+?\))\s*/, function(str, c) {
			color = c;
			return '';
		});
		
		if (!color) {
			// try simple declaration, like yellow, #fco, #ffffff, etc.
			var parts = colorStop.split(' ');
			color = parts[0];
			colorStop = parts[1] || '';
		}
		
		var result = {
			color: color
		};
		
		if (colorStop) {
			// there's position in color stop definition
			colorStop.replace(/^(\-?[\d\.]+)([a-z%]+)?$/, function(str, pos, unit) {
				result.position = pos;
				if (~pos.indexOf('.')) {
					unit = '';
				} else if (!unit) {
					unit = '%';
				}
				
				if (unit)
					result.unit = unit;
			});
		}
		
		return result;
	}
	
	/**
	 * Resolves property name (abbreviation): searches for snippet definition in 
	 * 'resources' and returns new name of matched property
	 */
	function resolvePropertyName(name, syntax) {
		var res = require('resources');
		var prefs = require('preferences');
		var snippet = res.findSnippet(syntax, name);
		
		if (!snippet && prefs.get('css.fuzzySearch')) {
			snippet = res.fuzzyFindSnippet(syntax, name, 
					parseFloat(prefs.get('css.fuzzySearchMinScore')));
		}
		
		if (snippet) {
			if (!_.isString(snippet)) {
				snippet = snippet.data;
			}
			
			return require('cssResolver').splitSnippet(snippet).name;
		}
	}
	
	/**
	 * Fills-out implied positions in color-stops. This function is useful for
	 * old Webkit gradient definitions
	 */
	function fillImpliedPositions(colorStops) {
		var from = 0;
		
		_.each(colorStops, function(cs, i) {
			// make sure that first and last positions are defined
			if (!i)
				return cs.position = cs.position || 0;
			
			if (i == colorStops.length - 1 && !('position' in cs))
				cs.position = 1;
			
			if ('position' in cs) {
				var start = colorStops[from].position || 0;
				var step = (cs.position - start) / (i - from);
				_.each(colorStops.slice(from, i), function(cs2, j) {
					cs2.position = start + step * j;
				});
				
				from = i;
			}
		});
	}
	
	/**
	 * Returns textual version of direction expressed in degrees
	 * @param {String} direction
	 * @returns {String}
	 */
	function textualDirection(direction) {
		var angle = parseFloat(direction);
		
		if(!_.isNaN(angle)) {
			switch(angle % 360) {
				case 0:   return 'left';
				case 90:  return 'bottom';
				case 180: return 'right';
				case 240: return 'top';
			}
		}
		
		return direction;
	}
	
	/**
	 * Creates direction definition for old Webkit gradients
	 * @param {String} direction
	 * @returns {String}
	 */
	function oldWebkitDirection(direction) {
		direction = textualDirection(direction);
		
		if(reDeg.test(direction))
			throw "The direction is an angle that can’t be converted.";
		
		var v = function(pos) {
			return ~direction.indexOf(pos) ? '100%' : '0';
		};
		
		return v('right') + ' ' + v('bottom') + ', ' + v('left') + ' ' + v('top');
	}
	
	function getPrefixedNames(name) {
		var prefixes = prefs.getArray('css.gradient.prefixes');
		var names = prefixes 
			? _.map(prefixes, function(p) {
				return '-' + p + '-' + name;
			}) 
			: [];
		
		names.push(name);
		
		return names;
	}
	
	/**
	 * Returns list of CSS properties with gradient
	 * @param {Object} gradient
	 * @param {String} propertyName Original CSS property name
	 * @returns {Array}
	 */
	function getPropertiesForGradient(gradient, propertyName) {
		var props = [];
		var css = require('cssResolver');
		
		if (prefs.get('css.gradient.fallback') && ~propertyName.toLowerCase().indexOf('background')) {
			props.push({
				name: 'background-color',
				value: '${1:' + gradient.colorStops[0].color + '}'
			});
		}
		
		_.each(prefs.getArray('css.gradient.prefixes'), function(prefix) {
			var name = css.prefixed(propertyName, prefix);
			if (prefix == 'webkit' && prefs.get('css.gradient.oldWebkit')) {
				try {
					props.push({
						name: name,
						value: module.oldWebkitLinearGradient(gradient)
					});
				} catch(e) {}
			}
			
			props.push({
				name: name,
				value: module.toString(gradient, prefix)
			});
		});
		
		return props.sort(function(a, b) {
			return b.name.length - a.name.length;
		});
	}
	
	/**
	 * Pastes gradient definition into CSS rule with correct vendor-prefixes
	 * @param {EditElement} property Matched CSS property
	 * @param {Object} gradient Parsed gradient
	 * @param {Range} valueRange If passed, only this range within property 
	 * value will be replaced with gradient. Otherwise, full value will be 
	 * replaced
	 */
	function pasteGradient(property, gradient, valueRange) {
		var rule = property.parent;
		var utils = require('utils');
		var alignVendor = require('preferences').get('css.alignVendor');
		
		// we may have aligned gradient definitions: find the smallest value
		// separator
		var sep = property.styleSeparator;
		var before = property.styleBefore;
		
		// first, remove all properties within CSS rule with the same name and
		// gradient definition
		_.each(rule.getAll(getPrefixedNames(property.name())), function(item) {
			if (item != property && /gradient/i.test(item.value())) {
				if (item.styleSeparator.length < sep.length) {
					sep = item.styleSeparator;
				}
				if (item.styleBefore.length < before.length) {
					before = item.styleBefore;
				}
				rule.remove(item);
			}
		});
		
		if (alignVendor) {
			// update prefix
			if (before != property.styleBefore) {
				var fullRange = property.fullRange();
				rule._updateSource(before, fullRange.start, fullRange.start + property.styleBefore.length);
				property.styleBefore = before;
			}
			
			// update separator value
			if (sep != property.styleSeparator) {
				rule._updateSource(sep, property.nameRange().end, property.valueRange().start);
				property.styleSeparator = sep;
			}
		}
		
		var value = property.value();
		if (!valueRange)
			valueRange = require('range').create(0, property.value());
		
		var val = function(v) {
			return utils.replaceSubstring(value, v, valueRange);
		};
		
		// put vanilla-clean gradient definition into current rule
		property.value(val(module.toString(gradient)) + '${2}');
		
		// create list of properties to insert
		var propsToInsert = getPropertiesForGradient(gradient, property.name());
		
		// align prefixed values
		if (alignVendor) {
			var values = _.pluck(propsToInsert, 'value');
			var names = _.pluck(propsToInsert, 'name');
			values.push(property.value());
			names.push(property.name());
			
			var valuePads = utils.getStringsPads(_.map(values, function(v) {
				return v.substring(0, v.indexOf('('));
			}));
			
			var namePads = utils.getStringsPads(names);
			property.name(_.last(namePads) + property.name());
			
			_.each(propsToInsert, function(prop, i) {
				prop.name = namePads[i] + prop.name;
				prop.value = valuePads[i] + prop.value;
			});
			
			property.value(_.last(valuePads) + property.value());
		}
		
		// put vendor-prefixed definitions before current rule
		_.each(propsToInsert, function(prop) {
			rule.add(prop.name, prop.value, rule.indexOf(property));
		});
	}
	
	/**
	 * Search for gradient definition inside CSS property value
	 */
	function findGradient(cssProp) {
		var value = cssProp.value();
		var gradient = null;
		var matchedPart = _.find(cssProp.valueParts(), function(part) {
			return gradient = module.parse(part.substring(value));
		});
		
		if (matchedPart && gradient) {
			return {
				gradient: gradient,
				valueRange: matchedPart
			};
		}
		
		return null;
	}
	
	/**
	 * Tries to expand gradient outside CSS value 
	 * @param {IEmmetEditor} editor
	 * @param {String} syntax
	 */
	function expandGradientOutsideValue(editor, syntax) {
		var propertyName = prefs.get('css.gradient.defaultProperty');
		
		if (!propertyName)
			return false;
		
		// assuming that gradient definition is written on new line,
		// do a simplified parsing
		var content = String(editor.getContent());
		/** @type Range */
		var lineRange = require('range').create(editor.getCurrentLineRange());
		
		// get line content and adjust range with padding
		var line = lineRange.substring(content)
			.replace(/^\s+/, function(pad) {
				lineRange.start += pad.length;
				return '';
			})
			.replace(/\s+$/, function(pad) {
				lineRange.end -= pad.length;
				return '';
			});
		
		var css = require('cssResolver');
		var gradient = module.parse(line);
		if (gradient) {
			var props = getPropertiesForGradient(gradient, propertyName);
			props.push({
				name: propertyName,
				value: module.toString(gradient) + '${2}'
			});
			
			var sep = css.getSyntaxPreference('valueSeparator', syntax);
			var end = css.getSyntaxPreference('propertyEnd', syntax);
			
			if (require('preferences').get('css.alignVendor')) {
				var pads = require('utils').getStringsPads(_.map(props, function(prop) {
					return prop.value.substring(0, prop.value.indexOf('('));
				}));
				_.each(props, function(prop, i) {
					prop.value = pads[i] + prop.value;
				});
			}
			
			props = _.map(props, function(item) {
				return item.name + sep + item.value + end;
			});
			
			editor.replaceContent(props.join('\n'), lineRange.start, lineRange.end);
			return true;
		}
		
		return false;
	}
	
	/**
	 * Search for gradient definition inside CSS value under cursor
	 * @param {String} content
	 * @param {Number} pos
	 * @returns {Object}
	 */
	function findGradientFromPosition(content, pos) {
		var cssProp = null;
		/** @type EditContainer */
		var cssRule = require('cssEditTree').parseFromPosition(content, pos, true);
		
		if (cssRule) {
			cssProp = cssRule.itemFromPosition(pos, true);
			if (!cssProp) {
				// in case user just started writing CSS property
				// and didn't include semicolon–try another approach
				cssProp = _.find(cssRule.list(), function(elem) {
					return elem.range(true).end == pos;
				});
			}
		}
		
		return {
			rule: cssRule,
			property: cssProp
		};
	}
	
	// XXX register expand abbreviation handler
	/**
	 * @param {IEmmetEditor} editor
	 * @param {String} syntax
	 * @param {String} profile
	 */
	require('expandAbbreviation').addHandler(function(editor, syntax, profile) {
		var info = require('editorUtils').outputInfo(editor, syntax, profile);
		if (!_.include(cssSyntaxes, info.syntax))
			return false;
		
		// let's see if we are expanding gradient definition
		var caret = editor.getCaretPos();
		var content = info.content;
		var css = findGradientFromPosition(content, caret);
		
		if (css.property) {
			// make sure that caret is inside property value with gradient 
			// definition
			var g = findGradient(css.property);
			if (g) {
				var ruleStart = css.rule.options.offset || 0;
				var ruleEnd = ruleStart + css.rule.toString().length;
				
				// Handle special case:
				// user wrote gradient definition between existing CSS 
				// properties and did not finished it with semicolon.
				// In this case, we have semicolon right after gradient 
				// definition and re-parse rule again
				if (/[\n\r]/.test(css.property.value())) {
					// insert semicolon at the end of gradient definition
					var insertPos = css.property.valueRange(true).start + g.valueRange.end;
					content = require('utils').replaceSubstring(content, ';', insertPos);
					var newCss = findGradientFromPosition(content, caret);
					if (newCss.property) {
						g = findGradient(newCss.property);
						css = newCss;
					}
				}
				
				// make sure current property has terminating semicolon
				css.property.end(';');
				
				// resolve CSS property name
				var resolvedName = resolvePropertyName(css.property.name(), syntax);
				if (resolvedName) {
					css.property.name(resolvedName);
				}
				
				pasteGradient(css.property, g.gradient, g.valueRange);
				editor.replaceContent(css.rule.toString(), ruleStart, ruleEnd, true);
				return true;
			}
		}
		
		return expandGradientOutsideValue(editor, syntax);
	});
	
	// XXX register "Reflect CSS Value" action delegate
	/**
	 * @param {EditElement} property
	 */
	require('reflectCSSValue').addHandler(function(property) {
		var utils = require('utils');
		
		var g = findGradient(property);
		if (!g)
			return false;
		
		var value = property.value();
		var val = function(v) {
			return utils.replaceSubstring(value, v, g.valueRange);
		};
		
		// reflect value for properties with the same name
		_.each(property.parent.getAll(getPrefixedNames(property.name())), function(prop) {
			if (prop === property)
				return;
			
			// check if property value starts with gradient definition
			var m = prop.value().match(/^\s*(\-([a-z]+)\-)?linear\-gradient/);
			if (m) {
				prop.value(val(module.toString(g.gradient, m[2] || '')));
			} else if ((m = prop.value().match(/\s*\-webkit\-gradient/))) {
				// old webkit gradient definition
				prop.value(val(module.oldWebkitLinearGradient(g.gradient)));
			}
		});
		
		return true;
	});
	
	return module = {
		/**
		 * Parses gradient definition
		 * @param {String} gradient
		 * @returns {Object}
		 */
		parse: function(gradient) {
			var result = null;
			require('utils').trim(gradient).replace(/^([\w\-]+)\((.+?)\)$/, function(str, type, definition) {
				// remove vendor prefix
				type = type.toLowerCase().replace(/^\-[a-z]+\-/, '');
				if (type == 'linear-gradient' || type == 'lg') {
					result = parseLinearGradient(definition);
					return '';
				}
				
				return str;
			});
			
			return result;
		},
		
		/**
		 * Produces linear gradient definition used in early Webkit 
		 * implementations
		 * @param {Object} gradient Parsed gradient
		 * @returns {String}
		 */
		oldWebkitLinearGradient: function(gradient) {
			if (_.isString(gradient))
				gradient = this.parse(gradient);
			
			if (!gradient)
				return null;
			
			var colorStops = _.map(gradient.colorStops, _.clone);
			
			// normalize color-stops position
			_.each(colorStops, function(cs) {
				if (!('position' in cs)) // implied position
					return;
				
				if (~cs.position.indexOf('.') || cs.unit == '%') {
					cs.position = parseFloat(cs.position) / (cs.unit == '%' ? 100 : 1);
				} else {
					throw "Can't convert color stop '" + (cs.position + (cs.unit || '')) + "'";
				}
			});
			
			fillImpliedPositions(colorStops);
			
			// transform color-stops into string representation
			colorStops = _.map(colorStops, function(cs, i) {
				if (!cs.position && !i)
					return 'from(' + cs.color + ')';
				
				if (cs.position == 1 && i == colorStops.length - 1)
					return 'to(' + cs.color + ')';
				
				return 'color-stop(' + (cs.position.toFixed(2).replace(/\.?0+$/, '')) + ', ' + cs.color + ')';
			});
			
			return '-webkit-gradient(linear, ' 
				+ oldWebkitDirection(gradient.direction)
				+ ', '
				+ colorStops.join(', ')
				+ ')';
		},
		
		/**
		 * Returns string representation of parsed gradient
		 * @param {Object} gradient Parsed gradient
		 * @param {String} prefix Vendor prefix
		 * @returns {String}
		 */
		toString: function(gradient, prefix) {
			if (gradient.type == 'linear') {
				var fn = (prefix ? '-' + prefix + '-' : '') + 'linear-gradient';
				
				// transform color-stops
				var colorStops = _.map(gradient.colorStops, function(cs) {
					return cs.color + ('position' in cs 
							? ' ' + cs.position + (cs.unit || '')
							: '');
				});
				
				if (gradient.direction 
						&& (!prefs.get('css.gradient.omitDefaultDirection') 
						|| !_.include(defaultLinearDirections, gradient.direction))) {
					colorStops.unshift(gradient.direction);
				}
				
				return fn + '(' + colorStops.join(', ') + ')';
			}
		}
	};
});