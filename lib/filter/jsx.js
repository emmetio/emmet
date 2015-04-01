/**
* Changes `class=` to `className=` and 'for=' to `htmlFor=`
* for the sake of JSX!
*/
if (typeof module === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		module.exports = factory(require, exports, module);
	};
}

define(function(require, exports, module) {
	var tokenMap = {
		'class=': 'className=',
		'for=': 'htmlFor='
	};

	function replaceTokens(str) {
		Object.keys(tokenMap).forEach(function(k){
		  str = str.replace(k, tokenMap[k]);
		})
		return str
	}

	return function process(tree) {
		tree.children.forEach(function(item) {
			item.start = replaceTokens(item.start);
			item.end = replaceTokens(item.end);
			item.content = replaceTokens(item.content);
			process(item);
		});

		return tree;
	};
});
