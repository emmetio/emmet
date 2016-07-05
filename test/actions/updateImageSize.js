var assert = require('assert');
var editor = require('../stubs/editor');
var action = require('../../lib/action/updateImageSize');

describe('Update Image Size action', function() {
	var run = function(content) {
		if (content) {
			editor.replaceContent(content);
		}
		action.updateImageSizeAction(editor);
	};

	it('should work for HTML', function() {
		// insert attributes
		run('<img${0} src="data:image/gif;base64,R0lGODlhAwACAHAAACH5BAUAAAAALAAAAAADAAIAQAIChF8AOw==" alt="" />');
		assert.equal(editor.getContent(), '<img src="data:image/gif;base64,R0lGODlhAwACAHAAACH5BAUAAAAALAAAAAADAAIAQAIChF8AOw==" alt="" width="3" height="2" />');

		// update existing attributes
		run('<img${0} src="data:image/gif;base64,R0lGODlhAwACAHAAACH5BAUAAAAALAAAAAADAAIAQAIChF8AOw==" width="100" height="100" alt="" />');
		assert.equal(editor.getContent(), '<img src="data:image/gif;base64,R0lGODlhAwACAHAAACH5BAUAAAAALAAAAAADAAIAQAIChF8AOw==" width="3" height="2" alt="" />');

		// update existing attribute and insert new one
		run('<img${0} src="data:image/gif;base64,R0lGODlhAwACAHAAACH5BAUAAAAALAAAAAADAAIAQAIChF8AOw==" width="100" alt="" />');
		assert.equal(editor.getContent(), '<img src="data:image/gif;base64,R0lGODlhAwACAHAAACH5BAUAAAAALAAAAAADAAIAQAIChF8AOw==" width="3" height="2" alt="" />');
	});

	it('should work for CSS', function() {
		editor.setSyntax('css');

		// Added "width" and "height" properties
		run('.test {\n\tbackgrou${0}nd: url(data:image/gif;base64,R0lGODlhAwACAHAAACH5BAUAAAAALAAAAAADAAIAQAIChF8AOw==);\n}');
		assert.equal(editor.getContent(), '.test {\n\tbackground: url(data:image/gif;base64,R0lGODlhAwACAHAAACH5BAUAAAAALAAAAAADAAIAQAIChF8AOw==);\n\twidth: 3px;\n\theight: 2px;\n}');

		// Updated "width" and "height" properties		
		run('.test {\n\tbackgrou${0}nd: url(data:image/gif;base64,R0lGODlhAwACAHAAACH5BAUAAAAALAAAAAADAAIAQAIChF8AOw==);\n\twidth: 100px;\n\theight: 100px;\n}');
		assert.equal(editor.getContent(), '.test {\n\tbackground: url(data:image/gif;base64,R0lGODlhAwACAHAAACH5BAUAAAAALAAAAAADAAIAQAIChF8AOw==);\n\twidth: 3px;\n\theight: 2px;\n}');

		// Updated "width" property and added "height"
		run('.test {\n\tbackgrou${0}nd: url(data:image/gif;base64,R0lGODlhAwACAHAAACH5BAUAAAAALAAAAAADAAIAQAIChF8AOw==);\n\twidth: 100px;\n}');
		assert.equal(editor.getContent(), '.test {\n\tbackground: url(data:image/gif;base64,R0lGODlhAwACAHAAACH5BAUAAAAALAAAAAADAAIAQAIChF8AOw==);\n\twidth: 3px;\n\theight: 2px;\n}');

		editor.setSyntax('html');
	});

	it('should return an error if the file does not exist', function() {
		try {
			run('<img src="${0}error.gif" />');
		} catch (err) {
			assert.equal(err, 'Can\'t find error.gif file');
		}
	});
});
