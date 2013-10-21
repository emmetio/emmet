/**
 * Reflect CSS value: takes rule's value under caret and pastes it for the same 
 * rules with vendor prefixes
 */
if (typeof module === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		module.exports = factory(require, exports, module);
	};
}

define(function(require, exports, module) {
	var _ = require('lodash');
	var handlerList = require('../assets/handlerList');
	var cssEditTree = require('../editTree/css');
	var utils = require('../utils/common');
	var actionUtils = require('../utils/action');
	var editorUtils = require('../utils/editor');
	var cssGradient = require('../resolver/cssGradient');

	/**
	 * @type HandlerList List of registered handlers
	 */
	var handlers = handlerList.create();
	
	function doCSSReflection(editor) {
		var outputInfo = editorUtils.outputInfo(editor);
		var caretPos = editor.getCaretPos();
		
		var cssRule = cssEditTree.parseFromPosition(outputInfo.content, caretPos);
		if (!cssRule) return;
		
		var property = cssRule.itemFromPosition(caretPos, true);
		// no property under cursor, nothing to reflect
		if (!property) return;
		
		var oldRule = cssRule.source;
		var offset = cssRule.options.offset;
		var caretDelta = caretPos - offset - property.range().start;
		
		handlers.exec(false, [property]);
		
		if (oldRule !== cssRule.source) {
			return {
				data:  cssRule.source,
				start: offset,
				end:   offset + oldRule.length,
				caret: offset + property.range().start + caretDelta
			};
		}
	}
	
	/**
	 * Returns regexp that should match reflected CSS property names
	 * @param {String} name Current CSS property name
	 * @return {RegExp}
	 */
	function getReflectedCSSName(name) {
		name = cssEditTree.baseName(name);
		var vendorPrefix = '^(?:\\-\\w+\\-)?', m;
		
		if (name == 'opacity' || name == 'filter') {
			return new RegExp(vendorPrefix + '(?:opacity|filter)$');
		} else if ((m = name.match(/^border-radius-(top|bottom)(left|right)/))) {
			// Mozilla-style border radius
			return new RegExp(vendorPrefix + '(?:' + name + '|border-' + m[1] + '-' + m[2] + '-radius)$');
		} else if ((m = name.match(/^border-(top|bottom)-(left|right)-radius/))) { 
			return new RegExp(vendorPrefix + '(?:' + name + '|border-radius-' + m[1] + m[2] + ')$');
		}
		
		return new RegExp(vendorPrefix + name + '$');
	}
	
	/**
	 * Reflects value from <code>donor</code> into <code>receiver</code>
	 * @param {CSSProperty} donor Donor CSS property from which value should
	 * be reflected
	 * @param {CSSProperty} receiver Property that should receive reflected 
	 * value from donor
	 */
	function reflectValue(donor, receiver) {
		var value = getReflectedValue(donor.name(), donor.value(), 
				receiver.name(), receiver.value());
		
		receiver.value(value);
	}
	
	/**
	 * Returns value that should be reflected for <code>refName</code> CSS property
	 * from <code>curName</code> property. This function is used for special cases,
	 * when the same result must be achieved with different properties for different
	 * browsers. For example: opаcity:0.5; → filter:alpha(opacity=50);<br><br>
	 * 
	 * This function does value conversion between different CSS properties
	 * 
	 * @param {String} curName Current CSS property name
	 * @param {String} curValue Current CSS property value
	 * @param {String} refName Receiver CSS property's name 
	 * @param {String} refValue Receiver CSS property's value
	 * @return {String} New value for receiver property
	 */
	function getReflectedValue(curName, curValue, refName, refValue) {
		curName = cssEditTree.baseName(curName);
		refName = cssEditTree.baseName(refName);
		
		if (curName == 'opacity' && refName == 'filter') {
			return refValue.replace(/opacity=[^)]*/i, 'opacity=' + Math.floor(parseFloat(curValue) * 100));
		} else if (curName == 'filter' && refName == 'opacity') {
			var m = curValue.match(/opacity=([^)]*)/i);
			return m ? utils.prettifyNumber(parseInt(m[1], 10) / 100) : refValue;
		}
		
		return curValue;
	}
	
	module = module || {};
	module.exports = {
		reflectCSSValueAction: function(editor) {
			if (editor.getSyntax() != 'css') {
				return false;
			}

			return actionUtils.compoundUpdate(editor, doCSSReflection(editor));
		},

		_defaultHandler: function(property) {
			var reName = getReflectedCSSName(property.name());
			_.each(property.parent.list(), function(p) {
				if (reName.test(p.name())) {
					reflectValue(property, p);
				}
			});
		},

		/**
		 * Adds custom reflect handler. The passed function will receive matched
		 * CSS property (as <code>CSSEditElement</code> object) and should
		 * return <code>true</code> if it was performed successfully (handled 
		 * reflection), <code>false</code> otherwise.
		 * @param {Function} fn
		 * @param {Object} options
		 */
		addHandler: function(fn, options) {
			handlers.add(fn, options);
		},
		
		/**
		 * Removes registered handler
		 * @returns
		 */
		removeHandler: function(fn) {
			handlers.remove(fn);
		}
	};

	// XXX add default handlers
	handlers.add(_.bind(module.exports._defaultHandler, module.exports), {order: -1});
	handlers.add(_.bind(cssGradient.reflectValueHandler, cssGradient));

	return module.exports;
});