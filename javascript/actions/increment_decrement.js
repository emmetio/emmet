/**
 * Increment/decrement number under cursor
 * @param {Function} require
 * @param {Underscore} _
 */
emmet.exec(function(require, _) {
	/**
	 * Extract number from current caret position of the <code>editor</code> and
	 * increment it by <code>step</code>
	 * @param {IEmmetEditor} editor
	 * @param {Number} step Increment step (may be negative)
	 */
	function incrementNumber(editor, step) {
		var utils = require('utils');
		var actionUtils = require('actionUtils');
		
		var hasSign = false;
		var hasDecimal = false;
			
		var r = actionUtils.findExpressionBounds(editor, function(ch, pos, content) {
			if (utils.isNumeric(ch))
				return true;
			if (ch == '.') {
				// make sure that next character is numeric too
				if (!utils.isNumeric(content.charAt(pos + 1)))
					return false;
				
				return hasDecimal ? false : hasDecimal = true;
			}
			if (ch == '-')
				return hasSign ? false : hasSign = true;
				
			return false;
		});
			
		if (r && r.length()) {
			var strNum = r.substring(String(editor.getContent()));
			var num = parseFloat(strNum);
			if (!_.isNaN(num)) {
				num = utils.prettifyNumber(num + step);
				
				// do we have zero-padded number?
				if (/^(\-?)0+[1-9]/.test(strNum)) {
					var minus = '';
					if (RegExp.$1) {
						minus = '-';
						num = num.substring(1);
					}
						
					var parts = num.split('.');
					parts[0] = utils.zeroPadString(parts[0], intLength(strNum));
					num = minus + parts.join('.');
				}
				
				editor.replaceContent(num, r.start, r.end);
				editor.createSelection(r.start, r.start + num.length);
				return true;
			}
		}
		
		return false;
	}
	
	/**
	 * Returns length of integer part of number
	 * @param {String} num
	 */
	function intLength(num) {
		num = num.replace(/^\-/, '');
		if (~num.indexOf('.')) {
			return num.split('.')[0].length;
		}
		
		return num.length;
	}
	
	var actions = require('actions');
	_.each([1, -1, 10, -10, 0.1, -0.1], function(num) {
		var prefix = num > 0 ? 'increment' : 'decrement';
		
		actions.add(prefix + '_number_by_' + String(Math.abs(num)).replace('.', '').substring(0, 2), function(editor) {
			return incrementNumber(editor, num);
		}, {label: 'Numbers/' + prefix.charAt(0).toUpperCase() + prefix.substring(1) + ' number by ' + Math.abs(num)});
	});
});