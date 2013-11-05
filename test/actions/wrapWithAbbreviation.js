var assert = require('assert');
var editor = require('../stubs/editor');
var parser = require('../../lib/parser/abbreviation');
var action = require('../../lib/action/wrapWithAbbreviation');
var utils  = require('../../lib/utils/common');

describe('Wrap With Abbreviation action', function() {
	var run = function(abbr, content) {
		if (abbr && content) {
			content = utils.escapeText(content);
			return parser.expand(abbr, {
				pastedContent: content, 
				syntax: 'html', 
				profile: 'plain'
			});
		}

		editor.setPromptOutput(abbr);
		action.wrapWithAbbreviationAction(editor);
	};

	it('debug', function() {
		// assert.equal(run('str', 'test'), '<strong>test</strong>');
		// assert.equal(run('cc:ie', 'hello world'), '<!--[if IE]>\n\thello world${0}\n<![endif]-->');
	})

	it('should work', function() {
		editor.replaceContent('<br${0} />');
		run('ul>li');
		assert.equal(editor.getContent(), '<ul>\n\t<li>\n\t\t<br />\n\t</li>\n</ul>');
		
		// wrap multiple lines
		editor.replaceContent('one\ntwo\nthree');
		editor.createSelection(0, 13);
		run('ul>li.i$*');
		assert.equal(editor.getContent(), '<ul>\n\t<li class="i1">one</li>\n\t<li class="i2">two</li>\n\t<li class="i3">three</li>\n</ul>');
		
		assert.equal(run('p.test', 'hello world'), '<p class="test">hello world</p>');
		assert.equal(run('p+p.test', 'hello world'), '<p></p><p class="test">hello world</p>');
		assert.equal(run('ul#nav.simple>li', 'hello world'), '<ul id="nav" class="simple"><li>hello world</li></ul>');
		assert.equal(run('ul#nav.simple>li*2', 'hello world'), '<ul id="nav" class="simple"><li></li><li>hello world</li></ul>');
		assert.equal(run('li*', 'one\ntwo\nthree'), '<li>one</li><li>two</li><li>three</li>');
		assert.equal(run('ul>li*', 'one\ntwo\nthree'), '<ul><li>one</li><li>two</li><li>three</li></ul>');
		assert.equal(run('li*>a', 'one\ntwo\nthree'), '<li><a href="">one</a></li><li><a href="">two</a></li><li><a href="">three</a></li>');
		assert.equal(run('li*>a', 'one\n    two\n    three'), '<li><a href="">one</a></li><li><a href="">two</a></li><li><a href="">three</a></li>', 'Removed indentation of wrapped content');
		
		assert.equal(run('span', '$2'), '<span>\\$2</span>');
		assert.equal(run('str', 'test'), '<strong>test</strong>');
		assert.equal(run('str>span', 'test'), '<strong><span>test</span></strong>');
		
		
		// test output placeholders
		assert.equal(run('li[title=$#]*>em', 'one\ntwo\nthree'), '<li title="one"><em></em></li><li title="two"><em></em></li><li title="three"><em></em></li>');
		assert.equal(run('li[title=$# class=item-$#]*>em{Label: $#}', 'one\ntwo\nthree'), '<li title="one" class="item-one"><em>Label: one</em></li><li title="two" class="item-two"><em>Label: two</em></li><li title="three" class="item-three"><em>Label: three</em></li>');
		
		// wrap with snippet
		assert.equal(run('cc:ie', 'hello world'), '<!--[if IE]>\n\thello world${0}\n<![endif]-->');
	});

	it('should properly wrap URL-like content', function() {
		assert.equal(run('a', 'http://emmet.io'), '<a href="http://emmet.io">http://emmet.io</a>');
		assert.equal(run('a', 'www.emmet.io'), '<a href="http://www.emmet.io">www.emmet.io</a>');
		assert.equal(run('a', 'emmet.io'), '<a href="">emmet.io</a>');
		assert.equal(run('a', 'info@emmet.io'), '<a href="mailto:info@emmet.io">info@emmet.io</a>');
	});
});
