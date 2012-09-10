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
		while (ch = stream.next()) {
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
		var names = _.map(prefixes, function(p) {
			return '-' + p + '-' + name;
		});
		names.push(name);
		
		return names;
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
		var css = require('cssResolver');
		/** @type Array */
		var prefixes = prefs.getArray('css.gradient.prefixes');
		
		// first, remove all properties within CSS rule with the same name and
		// gradient definition
		_.each(rule.getAll(getPrefixedNames(property.name())), function(item) {
			if (item != property && /gradient/i.test(item.value())) {
				rule.remove(item);
			}
		});
		
		var value = property.value();
		if (!valueRange)
			valueRange = require('range').create(0, property.value());
		
		var val = function(v) {
			return utils.replaceSubstring(value, v, valueRange);
		};
		
		// put vanilla-clean gradient definition into current rule
		var cssGradient = require('cssGradient');
		property.value(val(cssGradient.toString(gradient)));
		
		// create list of properties to insert
		var propsToInsert = [];
		_.each(prefixes, function(prefix) {
			var name = css.prefixed(property.name(), prefix);
			if (prefix == 'webkit' && prefs.get('css.gradient.oldWebkit')) {
				try {
					propsToInsert.push({
						name: name,
						value: val(cssGradient.oldWebkitLinearGradient(gradient))
					});
				} catch(e) {}
			}
			
			propsToInsert.push({
				name: name,
				value: val(cssGradient.toString(gradient, prefix))
			});
		});
		
		// sort properties by name length
		propsToInsert = propsToInsert.sort(function(a, b) {
			return b.name.length - a.name.length;
		});
		
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
		var cssGradient = require('cssGradient');
		var gradient = null;
		var matchedPart = _.find(cssProp.valueParts(), function(part) {
			return gradient = cssGradient.parse(part.substring(value));
		});
		
		if (matchedPart && gradient) {
			return {
				gradient: gradient,
				valueRange: matchedPart
			};
		}
		
		return null;
	}
	
	// XXX register expand abbreviation handler
	/**
	 * @param {IEmmetEditor} editor
	 * @param {String} syntax
	 * @param {String} profile
	 */
	require('expandAbbreviation').addHandler(function(editor, syntax, profile) {
		var info = require('editorUtils').outputInfo(editor, syntax, profile);
		if (info.syntax != 'css')
			return false;
		
		// let's see if we are expanding gradient definition
		var caret = editor.getCaretPos();
		/** @type EditContainer */
		var cssRule = require('cssEditTree').parseFromPosition(info.content, caret, true);
		if (cssRule) {
			var cssProp = cssRule.itemFromPosition(caret, true);
			if (!cssProp) {
				// in case user just started writing CSS property
				// and didn't include semicolon–try another approach
				cssProp = _.find(cssRule.list(), function(elem) {
					return elem.range(true).end == caret;
				});
			}
			
			if (cssProp) {
				// make sure that caret is inside property value with gradient 
				// definition
				var g = findGradient(cssProp);
				if (g) {
					// make sure current property has terminating semicolon
					cssProp.end(';');
					
					var ruleStart = cssRule.options.offset || 0;
					var ruleEnd = ruleStart + cssRule.toString().length;
					
					pasteGradient(cssProp, g.gradient, g.valueRange);
					editor.replaceContent(cssRule.toString(), ruleStart, ruleEnd, true);
					editor.setCaretPos(cssProp.valueRange(true).end);
					return true;
				}
			}
		}
		
		return false;
	});
	
	// XXX register "Reflect CSS Value" action delegate
	/**
	 * @param {EditElement} property
	 */
	require('reflectCSSValue').addHandler(function(property) {
		var cssGradient = require('cssGradient');
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
				prop.value(val(cssGradient.toString(g.gradient, m[2] || '')));
			} else if (m = prop.value().match(/\s*\-webkit\-gradient/)) {
				// old webkit gradient definition
				prop.value(val(cssGradient.oldWebkitLinearGradient(g.gradient)));
			}
		});
		
		return true;
	});
	
	return {
		/**
		 * Parses gradient definition
		 * @param {String} gradient
		 * @returns {Object}
		 */
		parse: function(gradient) {
			var result = null;
			gradient = require('utils').trim(gradient).replace(/^([\w\-]+)\((.+?)\)$/, function(str, type, definition) {
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