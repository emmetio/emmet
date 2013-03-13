/**
  	 * Set new caret position
		 * @param {Number} pos Caret position
		 */
		setCaretPos: function(pos) {
			context.anchor = context.pos = charToBytes(pos);
		},
/**
  	 *  Austin.Young Add 2013-3-12
		 *  Set Current Pos in visiable view
		 */
		showCurrPos: function(){
			var pos = context.pos;
			context.lines.current = context.lines.current;// if not add this it will not be in visiable view
			context.anchor = context.pos = pos; // set to position again
		},
