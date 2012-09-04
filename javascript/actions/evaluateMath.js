/**
 * Evaluates simple math expression under caret
 * @param {Function} require
 * @param {Underscore} _ 
 */
emmet.exec(function(require, _) {
	require('actions').add('evaluate_math_expression', function(editor) {
		var actionUtils = require('actionUtils');
		var utils = require('utils');
		
		var content = String(editor.getContent());
		var chars = '.+-*/\\';
		
		/** @type Range */
		var sel = require('range').create(editor.getSelectionRange());
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
