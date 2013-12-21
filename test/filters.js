var assert = require('assert');
var editor = require('./stubs/editor');
var action = require('../lib/action/expandAbbreviation');
var prefs = require('../lib/assets/preferences');

describe('Filters', function() {
	function expand(abbr, syntax, profile) {
		editor.replaceContent(abbr);
		editor.setCaretPos(abbr.length);
		action.expandAbbreviationAction(editor, syntax, profile);
	}

	describe('Yandex BEM2 (bem)', function() {
		it('should work', function() {
			expand('.b_m1._m2|bem');
			assert.equal(editor.getContent(), '<div class="b b_m1 b_m2"></div>');
			
			expand('.b._mod|bem');
			assert.equal(editor.getContent(), '<div class="b b_mod"></div>');
		});
	});
	
	describe('Yandex BEM (bem)', function() {
		it('should work', function() {
			expand('.b_m|bem');
			assert.equal(editor.getContent(), '<div class="b b_m"></div>');
			
			expand('.b_m1._m2|bem');
			assert.equal(editor.getContent(), '<div class="b b_m1 b_m2"></div>');
			
			expand('.b>._m|bem');
			assert.equal(editor.getContent(), '<div class="b">\n\t<div class="b b_m"></div>\n</div>');
			
			expand('.b>._m1>._m2|bem');
			assert.equal(editor.getContent(), '<div class="b">\n\t<div class="b b_m1">\n\t\t<div class="b b_m2"></div>\n\t</div>\n</div>');
			
			expand('.b>.__e|bem');
			assert.equal(editor.getContent(), '<div class="b">\n\t<div class="b__e"></div>\n</div>');
			
			expand('.b>.-e|bem');
			assert.equal(editor.getContent(), '<div class="b">\n\t<div class="b__e"></div>\n</div>');
			
			expand('.b>.__e>.__e|bem');
			assert.equal(editor.getContent(), '<div class="b">\n\t<div class="b__e">\n\t\t<div class="b__e"></div>\n\t</div>\n</div>');
			
			expand('.b>.__e1>.____e2|bem');
			assert.equal(editor.getContent(), '<div class="b">\n\t<div class="b__e1">\n\t\t<div class="b__e2"></div>\n\t</div>\n</div>');
			
			expand('.b>.-e1>.-e2|bem');
			assert.equal(editor.getContent(), '<div class="b">\n\t<div class="b__e1">\n\t\t<div class="b__e2"></div>\n\t</div>\n</div>');
			
			expand('.b1>.b2_m1>.__e1+.____e2_m2|bem');
			assert.equal(editor.getContent(), '<div class="b1">\n\t<div class="b2 b2_m1">\n\t\t<div class="b2__e1"></div>\n\t\t<div class="b1__e2 b1__e2_m2"></div>\n\t</div>\n</div>');
			
			expand('.b>.__e1>.__e2|bem');
			assert.equal(editor.getContent(), '<div class="b">\n\t<div class="b__e1">\n\t\t<div class="b__e2"></div>\n\t</div>\n</div>');
			
			expand('.b>.__e1>.____e2|bem');
			assert.equal(editor.getContent(), '<div class="b">\n\t<div class="b__e1">\n\t\t<div class="b__e2"></div>\n\t</div>\n</div>');
			
			expand('.b._mod|bem');
			assert.equal(editor.getContent(), '<div class="b b_mod"></div>');
			
			// test custom separators
			prefs._startTest();
			prefs.define('bem.shortElementPrefix', '');
			prefs.define('bem.modifierSeparator', '--');
			
			expand('.b>.-e1|bem');
			assert.equal(editor.getContent(), '<div class="b">\n\t<div class="-e1"></div>\n</div>', 'Short notation disabled');
			
			expand('.b>.--m1>.--m2|bem');
			assert.equal(editor.getContent(), '<div class="b">\n\t<div class="b b--m1">\n\t\t<div class="b b--m2"></div>\n\t</div>\n</div>', 'Custom modifier separator');
			
			prefs._stopTest();
		});

		it('should pass regression tests', function () {
			expand('.name1__name2__name3|bem');
			assert.equal(editor.getContent(), '<div class="name1__name2__name3"></div>');

			expand('.name1__name2__name3_name4_name5|bem');
			assert.equal(editor.getContent(), '<div class="name1__name2__name3 name1__name2__name3_name4_name5"></div>');

			expand('.name1__name2__name3__name4_name5|bem');
			assert.equal(editor.getContent(), '<div class="name1__name2__name3__name4 name1__name2__name3__name4_name5"></div>');
		});
	});
	
	describe('Comment (c)', function() {
		it('should work', function() {
			expand('#a>#b.c>i|c');
			assert.equal(editor.getContent(), '<div id="a">\n\t<div id="b" class="c"><i></i></div>\n\t<!-- /#b.c -->\n</div>\n<!-- /#a -->', 'Applied `c` filter');
		});
	});
	
	describe('Escape (e)', function() {
		it('should work', function() {
			expand('a>b|e');
			assert.equal(editor.getContent(), '&lt;a href=""&gt;&lt;b&gt;&lt;/b&gt;&lt;/a&gt;', 'Applied `e` filter');
		});
	});
	
	describe('Formatting and HTML filter (html)', function() {
		it('should work', function() {
			expand('div>p|html');
			assert.equal(editor.getContent(), '<div>\n\t<p></p>\n</div>', 'Output block tags');
			
			expand('span>i|html');
			assert.equal(editor.getContent(), '<span><i></i></span>', 'Output inline elements');
			
			expand('select>option*3|html');
			assert.equal(editor.getContent(), '<select name="" id="">\n\t<option value=""></option>\n\t<option value=""></option>\n\t<option value=""></option>\n</select>', 'Special case for `select>option`');
			
			expand('div>i+p+b|html');
			assert.equal(editor.getContent(), '<div>\n\t<i></i>\n\t<p></p>\n\t<b></b>\n</div>', 'Mixin inline and block elements');
			
			expand('div>i*3|html');
			assert.equal(editor.getContent(), '<div>\n\t<i></i>\n\t<i></i>\n\t<i></i>\n</div>', 'Special case for many inline elements');
		});
	});
	
	describe('HAML (haml)', function() {
		it('should work', function() {
			expand('#header>ul.nav>li[title=test$]*2|haml');
			assert.equal(editor.getContent(), '#header\n\t%ul.nav\n\t\t%li{:title => "test1"}\n\t\t%li{:title => "test2"}');

			// check data attrs
			expand('.c[data-n1=v1 title=test data-n2=v2]|haml');
			assert.equal(editor.getContent(), '%div.c{:data => {:n1 => "v1", :n2 => "v2"}, :title => "test"}');

			// check boolean attrs
			expand('.c[disabled.]|haml');
			assert.equal(editor.getContent(), '%div.c{:disabled => true}');
		});
	});
	
	describe('Single line (s)', function() {
		it('should work', function() {
			expand('div>p|s');
			assert.equal(editor.getContent(), '<div><p></p></div>', 'Applied `s` filter');
		});
	});
	
	describe('Trim list symbols (t)', function() {
		it('should work', function() {
			expand('{1. test}|t');
			assert.equal(editor.getContent(), 'test', 'Removed `1.`');
			
			expand('{ 1 test}|t');
			assert.equal(editor.getContent(), 'test', 'Removed ` 1`');
			
			expand('{ * test}|t');
			assert.equal(editor.getContent(), 'test', 'Removed `*`');
		});
	});
	
	describe('XSL (xsl)', function() {
		it('should work', function() {
			var oldSyntax = editor.getSyntax();
			var oldProfile = editor.getProfileName();
			editor.setSyntax('xsl');
			editor.setProfileName('xml');
			
			expand('vare|xsl');
			assert.equal(editor.getContent(), '<xsl:variable name="" select=""/>', 'Expanded variable template, no attribute removal');
			
			expand('vare>p|xsl');
			assert.equal(editor.getContent(), '<xsl:variable name="">\n\t<p></p>\n</xsl:variable>', 'Expanded variable template, "select" attribute removed');
			
			editor.setSyntax(oldSyntax);
			editor.setProfileName(oldProfile);
		});
	});

	describe('Jade', function() {
		it('should work', function() {
			var oldSyntax = editor.getSyntax();
			var oldProfile = editor.getProfileName();
			editor.setSyntax('jade');
			editor.setProfileName('xml');
			
			expand('#header>ul.nav>li[title=test$]*2|jade');
			assert.equal(editor.getContent(), '#header\n\tul.nav\n\t\tli(title="test1")\n\t\tli(title="test2")');

			// check data attrs
			expand('.c[data-n1=v1 title=test data-n2=v2]|jade');
			assert.equal(editor.getContent(), '.c(data-n1="v1", title="test", data-n2="v2")');

			// check boolean attrs
			expand('.c[disabled. title=test]|jade');
			assert.equal(editor.getContent(), '.c(disabled, title="test")');

			// check text
			expand('span{Text}>b{Text 2}|jade');
			assert.equal(editor.getContent(), 'span Text\n\tb Text 2');

			expand('span{Text 1${newline}Text 2}>b{Text 3}|jade');
			assert.equal(editor.getContent(), 'span\n\t| Text 1\n\t| Text 2\n\tb Text 3');
			
			
			editor.setSyntax(oldSyntax);
			editor.setProfileName(oldProfile);
		});
	});

	describe('Slim', function() {
		it('should work', function() {
			var oldSyntax = editor.getSyntax();
			var oldProfile = editor.getProfileName();
			editor.setSyntax('slim');
			editor.setProfileName('xml');
			
			expand('#header>ul.nav>li[title=test$]*2|slim');
			assert.equal(editor.getContent(), '#header\n\tul.nav\n\t\tli title="test1"\n\t\tli title="test2"');

			expand('img', 'slim', 'xml');
			assert.equal(editor.getContent(), 'img src="" alt=""/');

			expand('img', 'slim', 'html');
			assert.equal(editor.getContent(), 'img src="" alt=""');

			// check data attrs
			expand('.c[data-n1=v1 title=test data-n2=v2]|slim');
			assert.equal(editor.getContent(), '.c data-n1="v1" title="test" data-n2="v2"');

			// check boolean attrs
			expand('.c[disabled. title=test]|slim');
			assert.equal(editor.getContent(), '.c disabled=true title="test"');

			// check text
			expand('span{Text}>b{Text 2}|slim');
			assert.equal(editor.getContent(), 'span Text\n\tb Text 2');

			expand('span{Text 1${newline}Text 2}>b{Text 3}|slim');
			assert.equal(editor.getContent(), 'span\n\t| Text 1\n\t  Text 2\n\tb Text 3');
			
			
			editor.setSyntax(oldSyntax);
			editor.setProfileName(oldProfile);
		});
	});
});
