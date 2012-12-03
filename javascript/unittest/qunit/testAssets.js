var testAssets = (function() {
	
	function createMatchString(text, range, caret) {
		range = emmet.require('range').create(range);
		var utils = emmet.require('utils');
		var result = utils.replaceSubstring(text, '[' + range.substring(text) + ']', range);
		
		if (!_.isUndefined(caret) && caret !== null) {
			var delta = 0;
			
			if (range.start < caret) {
				delta++;
			}
			
			if (range.end < caret) {
				delta++;
			}
			
			result = utils.replaceSubstring(result, '|', caret + delta);
		}
		
		
		return result;
	}
	
	return {
		textRanges: function(text, actualRange, expectedRange, caretPos, label) {
			var actual = createMatchString(text, actualRange, caretPos);
			var expected = createMatchString(text, expectedRange, caretPos);
			
			equal(actual, expected, label || expected);
		}
	};
})();