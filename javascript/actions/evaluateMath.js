/**
 * Evaluates simple math expression under caret
 * @param {IZenEditor} editor
 */
zen_coding.require('actions').add('evaluate_math_expression', function(editor) {
	var actionUtils = zen_coding.require('actionUtils');
	var utils = zen_coding.require('utils');
	
	var content = String(editor.getContent());
	var chars = '.+-*/\\';
		
	
	var sel = editor.getSelectionRange();
	var r = (sel && sel.start != sel.end) 
		? [sel.start, sel.end] 
		: actionUtils.findExpressionBounds(editor, function(ch) {
			return utils.isNumeric(ch) || chars.indexOf(ch) != -1;
		});
		
	if (r) {
		var expr = content.substring(r[0], r[1]);
		
		// replace integral division: 11\2 => Math.round(11/2) 
		expr = expr.replace(/([\d\.\-]+)\\([\d\.\-]+)/g, 'Math.round($1/$2)');
		
		try {
			var result = new Function('return ' + expr)();
			result = utils.prettifyNumber(result);
			editor.replaceContent(result, r[0], r[1]);
			editor.setCaretPos(r[0] + result.length);
			return true;
		} catch (e) {}
	}
	
	return false;
});
