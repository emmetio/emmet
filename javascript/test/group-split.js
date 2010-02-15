/**
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */
 
/**
 * Creates group element
 * @param {String} expr Part of abbreviation that belongs to group item
 * @param {abbrGroup} [parent] Parent group item element
 */function abbrGroup(parent) {
	return {
		expr: '',
		parent: parent || null,
		children: [],
		addChild: function() {
			var child = abbrGroup(this);
			this.children.push(child);
			return child;
		},
		cleanUp: function() {
			for (var i = this.children.length - 1; i >= 0; i--) {
				var expr = this.children[i].expr;
				if (!expr)
					this.children.splice(i, 1);
				else {
					// remove operators at the and of expression
//					this.children[i].expr = expr.replace(/[\+>]+$/, '');
					this.children[i].cleanUp();
				}
			}
		}
	}
}

/**
 * Split abbreviation on groups
 * @param {String} abbr
 * @return {abbrGroup()}
 */
function splitByGroups(abbr) {
	var root = abbrGroup(),
		last_parent = root,
		cur_item = root.addChild(),
		stack = [],
		i = 0,
		il = abbr.length;
	
	while (i < il) {
		var ch = abbr.charAt(i);
		switch(ch) {
			case '(':
				// found new group
				var operator = i ? abbr.charAt(i - 1) : '';
				if (operator == '>') {
					stack.push(cur_item);
					last_parent = cur_item;
					cur_item = null;
				} else {
					stack.push(last_parent);
					cur_item = null;
				}
				break;
			case ')':
				last_parent = stack.pop();
				cur_item = null;
				var next_char = (i < il - 1) ? abbr.charAt(i + 1) : '';
				if (next_char == '+' || next_char == '>') 
					// next char is group operator, skip it
					i++;
				break;
			default:
				if (ch == '+' || ch == '>') {
					// skip operator if it's followed by parenthesis
					var next_char = (i + 1 < il) ? abbr.charAt(i + 1) : '';
					if (next_char == '(') break;
				}
				if (!cur_item)
					cur_item = last_parent.addChild();
				cur_item.expr += ch;
		}
		
		i++;
	}
	
	root.cleanUp();
	return root;
}