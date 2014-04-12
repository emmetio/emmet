var assert = require('assert');
var editor = require('../stubs/editor');
var action = require('../../lib/action/reflectCSSValue');
var prefs  = require('../../lib/assets/preferences');

describe('Reflect CSS Value action', function() {
	var run = function(content) {
		if (content) {
			editor.replaceContent(content);
		}
		action.reflectCSSValueAction(editor);
	};

	it('should work', function() {
		var oldVal = prefs.get('css.reflect.oldIEOpacity');
		prefs.set('css.reflect.oldIEOpacity', true);
		editor.setSyntax('css');
		
		run('a {p:1; -a-p:12${0}; -b-p:1; x:1;}');
		assert.equal(editor.getContent(), 'a {p:12; -a-p:12; -b-p:12; x:1;}');
		assert.equal(editor.getCaretPos(), 16);
		
		run('a {opacity: 0.5${0}; filter: alpha(opacity=60)}');
		assert.equal(editor.getContent(), 'a {opacity: 0.5; filter: alpha(opacity=50)}');
		
		run('a {border-top-left-radius: 10px${0}; -moz-border-radius-topleft: 5px;}');
		assert.equal(editor.getContent(), 'a {border-top-left-radius: 10px; -moz-border-radius-topleft: 10px;}');
		
		prefs.set('css.reflect.oldIEOpacity', oldVal);
		editor.setSyntax('html');
	});

	it('should reflect properties in values', function() {
		editor.setSyntax('css');
		
		run('a {-webkit-transition: -webkit-transform 0.2s ease-out;transition: transform 0.3s ease-in${0};}');
		assert.equal(editor.getContent(), 'a {-webkit-transition: -webkit-transform 0.3s ease-in;transition: transform 0.3s ease-in;}');

		run('a {-moz-transition: -moz-transform 0.2s ease-out${0};transition: transform 0.3s ease-in${0};}');
		// Mozilla supports unprefixed transform property
		assert.equal(editor.getContent(), 'a {-moz-transition: transform 0.2s ease-out;transition: transform 0.2s ease-out;}');
		
		editor.setSyntax('html');
	});
});
