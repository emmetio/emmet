/**
 * Move between next/prev edit points. 'Edit points' are places between tags 
 * and quotes of empty attributes in html
 * @constructor
 * 
 * @memberOf __editPointActionDefine
 * @param {Function} require
 * @param {Underscore} _
 */
emmet.exec(function(require, _) {
	/**
	 * Search for new caret insertion point
	 * @param {IEmmetEditor} editor Editor instance
	 * @param {Number} inc Search increment: -1 — search left, 1 — search right
	 * @param {Number} offset Initial offset relative to current caret position
	 * @return {Number} Returns -1 if insertion point wasn't found
	 */
	function findNewEditPoint(editor, inc, offset) {
		inc = inc || 1;
		offset = offset || 0;
		
		var curPoint = editor.getCaretPos() + offset;
		var content = String(editor.getContent());
		var maxLen = content.length;
		var nextPoint = -1;
		var reEmptyLine = /^\s+$/;
		
		function getLine(ix) {
			var start = ix;
			while (start >= 0) {
				var c = content.charAt(start);
				if (c == '\n' || c == '\r')
					break;
				start--;
			}
			
			return content.substring(start, ix);
		}
			
		while (curPoint <= maxLen && curPoint >= 0) {
			curPoint += inc;
			var curChar = content.charAt(curPoint);
			var nextChar = content.charAt(curPoint + 1);
			var prevChar = content.charAt(curPoint - 1);
				
			switch (curChar) {
				case '"':
				case '\'':
					if (nextChar == curChar && prevChar == '=') {
						// empty attribute
						nextPoint = curPoint + 1;
					}
					break;
				case '>':
					if (nextChar == '<') {
						// between tags
						nextPoint = curPoint + 1;
					}
					break;
				case '\n':
				case '\r':
					// empty line
					if (reEmptyLine.test(getLine(curPoint - 1))) {
						nextPoint = curPoint;
					}
					break;
			}
			
			if (nextPoint != -1)
				break;
		}
		
		return nextPoint;
	}
	
	/** @type emmet.actions */
	var actions = require('actions');
	
	/**
	 * Move caret to previous edit point
	 * @param {IEmmetEditor} editor Editor instance
	 */
	actions.add('prev_edit_point', function(editor) {
		var curPos = editor.getCaretPos();
		var newPoint = findNewEditPoint(editor, -1);
			
		if (newPoint == curPos)
			// we're still in the same point, try searching from the other place
			newPoint = findNewEditPoint(editor, -1, -2);
		
		if (newPoint != -1) {
			editor.setCaretPos(newPoint);
			return true;
		}
		
		return false;
	}, {label: 'Previous Edit Point'});
	
	/**
	 * Move caret to next edit point
	 * @param {IEmmetEditor} editor Editor instance
	 */
	actions.add('next_edit_point', function(editor) {
		var newPoint = findNewEditPoint(editor, 1);
		if (newPoint != -1) {
			editor.setCaretPos(newPoint);
			return true;
		}
		
		return false;
	});
});