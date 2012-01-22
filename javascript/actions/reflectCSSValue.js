/**
 * Reflect CSS value: takes rule's value under caret and pastes it for the same 
 * rules with vendor prefixes
 * @constructor
 * @memberOf __zenReflectCSSAction
 */
(function() {
	zen_coding.require('actions').add('reflect_css_value', function(editor) {
		if (editor.getSyntax() != 'css') return false;
		
		return zen_coding.require('actionUtils').compoundUpdate(editor, doCSSReflection(editor));
	});
	
	function doCSSReflection(editor) {
		/** @type zen_coding.parserUtils */
		var parserUtils = zen_coding.require('parserUtils');
		
		var content = String(editor.getContent());
		var caretPos = editor.getCaretPos();
		var css = parserUtils.extractCSSRule(content, caretPos);
		var v;
			
		if (!css || caretPos < css[0] || caretPos > css[1])
			// no matching CSS rule or caret outside rule bounds
			return false;
			
		var tokens = parserUtils.parseCSS(content.substring(css[0], css[1]), css[0]);
		var token_ix = parserUtils.findTokenFromPosition(tokens, caretPos, 'identifier');
		
		if (token_ix != -1) {
			var cur_prop = tokens[token_ix].content;
			var value_token = parserUtils.findValueToken(tokens, token_ix + 1);
			var base_name = parserUtils.getBaseCSSName(cur_prop);
			var re_name = new RegExp('^(?:\\-\\w+\\-)?' + base_name + '$');
			var re_name = getReflectedCSSName(base_name);
			var values = [];
				
			if (!value_token) return false;
				
			// search for all vendor-prefixed properties
			for (var i = 0, token, il = tokens.length; i < il; i++) {
				token = tokens[i];
				if (token.type == 'identifier' && re_name.test(token.content) && token.content != cur_prop) {
					v = parserUtils.findValueToken(tokens, i + 1);
					if (v) 
						values.push({name: token, value: v});
				}
			}
			
			// some editors do not provide easy way to replace multiple code 
			// fragments so we have to squash all replace operations into one
			if (values.length) {
				var data = content.substring(values[0].value.start, values[values.length - 1].value.end);
				var offset = values[0].value.start;
				var value = value_token.content;
				var rv;
					
				for (var i = values.length - 1; i >= 0; i--) {
					v = values[i].value;
					rv = getReflectedValue(cur_prop, value, values[i].name.content, v.content);
					data = replaceSubstring(data, v.start - offset, v.end - offset, rv);
						
					// also calculate new caret position
					if (v.start < caretPos) {
						caretPos += rv.length - v.content.length;
					}
				}
				
				return {
					'data': data,
					'start': offset,
					'end': values[values.length - 1].value.end,
					'caret': caretPos
				};
			}
		}
	}
	
	/**
	 * Returns regexp that should match reflected CSS property names
	 * @param {String} name Current CSS property name
	 * @return {RegExp}
	 */
	function getReflectedCSSName(name) {
		name = zen_coding.require('parserUtils').getBaseCSSName(name);
		var vendorPrefix = '^(?:\\-\\w+\\-)?', m;
		
		if (name == 'opacity' || name == 'filter') {
			return new RegExp(vendorPrefix + '(?:opacity|filter)$');
		} else if (m = name.match(/^border-radius-(top|bottom)(left|right)/)) {
			// Mozilla-style border radius
			return new RegExp(vendorPrefix + '(?:' + name + '|border-' + m[1] + '-' + m[2] + '-radius)$');
		} else if (m = name.match(/^border-(top|bottom)-(left|right)-radius/)) { 
			return new RegExp(vendorPrefix + '(?:' + name + '|border-radius-' + m[1] + m[2] + ')$');
		}
		
		return new RegExp(vendorPrefix + name + '$');
	}
	
	/**
	 * Returns value that should be reflected for <code>ref_name</code> CSS property
	 * from <code>cur_name</code> property. This function is used for special cases,
	 * when the same result must be achieved with different properties for different
	 * browsers. For example: opаcity:0.5; -> filter:alpha(opacity=50);<br><br>
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
		var parserUtils = zen_coding.require('parserUtils');
		var utils = zen_coding.require('utils');
		curName = parserUtils.getBaseCSSName(curName);
		refName = parserUtils.getBaseCSSName(refName);
		
		if (curName == 'opacity' && refName == 'filter') {
			return refValue.replace(/opacity=[^)]*/i, 'opacity=' + Math.floor(parseFloat(curValue) * 100));
		} else if (curName == 'filter' && refName == 'opacity') {
			var m = curValue.match(/opacity=([^)]*)/i);
			return m ? utils.prettifyNumber(parseInt(m[1]) / 100) : refValue;
		}
		
		return curValue;
	}
	
	/**
	 * Replace substring of <code>text</code>, defined by <code>start</code> and 
	 * <code>end</code> indexes with <code>new_value</code>
	 * @param {String} text
	 * @param {Number} start
	 * @param {Number} end
	 * @param {String} new_value
	 * @return {String}
	 */
	function replaceSubstring(text, start, end, new_value) {
		return text.substring(0, start) + new_value + text.substring(end);
	}
})();