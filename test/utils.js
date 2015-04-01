var assert = require('assert');
var utils = require('../lib/utils/common');
var editorUtils = require('../lib/utils/editor');

describe('Utils', function() {
	var normalize = function(str, options) {
		return editorUtils.normalize(str, utils.extend({
			indentation: '  '
		}, options || {}));
	};

	it('normalize simple indentation', function() {
		assert.equal(normalize('\ta\n\tb'), '  a\n  b');
		assert.equal(normalize('\t\t\ta\n\t\tb'), '      a\n    b');
	});

	it('normalize mixed indentation', function() {
		assert.equal(normalize('   \ta\n \tb'), '     a\n   b');
		assert.equal(normalize(' \t a\n   \tb'), '    a\n     b');
	});
});