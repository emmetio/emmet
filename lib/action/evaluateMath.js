/**
 * Evaluates simple math expression under caret
 */
if (typeof module === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		module.exports = factory(require, exports, module);
	};
}

define(function(require, exports, module) {
	var actionUtils = require('../utils/action');
	var utils = require('../utils/common');
	var range = require('../assets/range');
	var actions = require('./base');

	actions.add('evaluate_math_expression', function(editor) {
		var content = String(editor.getContent());
		var chars = '.+-*/\\';
		
		/** @type Range */
		var sel = range(editor.getSelectionRange());
		if (!sel.length()) {
			sel = actionUtils.findExpressionBounds(editor, function(ch) {
				return utils.isNumeric(ch) || chars.indexOf(ch) != -1;
			});
		}
		
		if (sel && sel.length()) {
			var expr = sel.substring(content);
			
			// replace integral division: 11\2 => Math.round(11/2) 
			expr = expr.replace(/([\d\.\-]+)\\([\d\.\-]+)/g, 'Math.round($1/$2)');
			
			try {
				var result = utils.prettifyNumber(new Function('return ' + expr)());
				editor.replaceContent(result, sel.start, sel.end);
				editor.setCaretPos(sel.start + result.length);
				return true;
			} catch (e) {}
		}
		
		return false;
	}, {label: 'Numbers/Evaluate Math Expression'});
});
