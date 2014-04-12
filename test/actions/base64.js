var assert = require('assert');
var path = require('path');
var editor = require('../stubs/editor');
var action = require('../../lib/action/base64');

describe('Base64 encoder/decoder', function() {
	it('should work', function() {
		editor.replaceContent('<img src="${0}e.gif" />');

		action.encodeDecodeDataUrlAction(editor);
		assert.equal(editor.getContent(), '<img src="data:image/gif;base64,R0lGODdhAQABAIAAAAAAAAAAACH5BAEAAAEALAAAAAABAAEAAAICTAEAOw==" />');
	});
});
