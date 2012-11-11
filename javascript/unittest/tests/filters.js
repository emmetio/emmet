
(function() {
	var actions = emmet.require('actions');
	
	function expand(abbr) {
		editorStub.replaceContent(abbr);
		editorStub.setCaretPos(abbr.length);
		actions.run('expand_abbreviation', editorStub);
	}
	
	module('Filters');
	test('Yandex BEM2 (bem)', function() {
		expand('.b_m1._m2|bem');
		equal(editorStub.getContent(), '<div class="b b_m1 b_m2"></div>');
		
		expand('.b._mod|bem');
		equal(editorStub.getContent(), '<div class="b b_mod"></div>');
	});
	
	test('Yandex BEM (bem)', function() {
		expand('.b_m|bem');
		equal(editorStub.getContent(), '<div class="b b_m"></div>');
		
		expand('.b_m1._m2|bem');
		equal(editorStub.getContent(), '<div class="b b_m1 b_m2"></div>');
		
		expand('.b>._m|bem');
		equal(editorStub.getContent(), '<div class="b">\n\t<div class="b b_m"></div>\n</div>');
		
		expand('.b>._m1>._m2|bem');
		equal(editorStub.getContent(), '<div class="b">\n\t<div class="b b_m1">\n\t\t<div class="b b_m2"></div>\n\t</div>\n</div>');
		
		expand('.b>.__e|bem');
		equal(editorStub.getContent(), '<div class="b">\n\t<div class="b__e"></div>\n</div>');
		
		expand('.b>.-e|bem');
		equal(editorStub.getContent(), '<div class="b">\n\t<div class="b__e"></div>\n</div>');
		
		expand('.b>.__e>.__e|bem');
		equal(editorStub.getContent(), '<div class="b">\n\t<div class="b__e">\n\t\t<div class="b__e"></div>\n\t</div>\n</div>');
		
		expand('.b>.__e1>.____e2|bem');
		equal(editorStub.getContent(), '<div class="b">\n\t<div class="b__e1">\n\t\t<div class="b__e2"></div>\n\t</div>\n</div>');
		
		expand('.b>.-e1>.-e2|bem');
		equal(editorStub.getContent(), '<div class="b">\n\t<div class="b__e1">\n\t\t<div class="b__e2"></div>\n\t</div>\n</div>');
		
		expand('.b1>.b2_m1>.__e1+.____e2_m2|bem');
		equal(editorStub.getContent(), '<div class="b1">\n\t<div class="b2 b2_m1">\n\t\t<div class="b2__e1"></div>\n\t\t<div class="b1__e2 b1__e2_m2"></div>\n\t</div>\n</div>');
		
		expand('.b>.__e1>.__e2|bem');
		equal(editorStub.getContent(), '<div class="b">\n\t<div class="b__e1">\n\t\t<div class="b__e2"></div>\n\t</div>\n</div>');
		
		expand('.b>.__e1>.____e2|bem');
		equal(editorStub.getContent(), '<div class="b">\n\t<div class="b__e1">\n\t\t<div class="b__e2"></div>\n\t</div>\n</div>');
		
		expand('.b._mod|bem');
		equal(editorStub.getContent(), '<div class="b b_mod"></div>');
		
		// test custom separators
		var prefs = emmet.require('preferences');
		prefs._startTest();
		prefs.define('bem.shortElementPrefix', '');
		prefs.define('bem.modifierSeparator', '--');
		
		expand('.b>.-e1|bem');
		equal(editorStub.getContent(), '<div class="b">\n\t<div class="-e1"></div>\n</div>', 'Short notation disabled');
		
		expand('.b>.--m1>.--m2|bem');
		equal(editorStub.getContent(), '<div class="b">\n\t<div class="b b--m1">\n\t\t<div class="b b--m2"></div>\n\t</div>\n</div>', 'Custom modifier separator');
		
		prefs._stopTest();
	});
	
	test('Comment (c)', function() {
		expand('#a>#b.c>i|c');
		equal(editorStub.getContent(), '<div id="a">\n\t<div id="b" class="c"><i></i></div>\n\t<!-- /#b.c -->\n</div>\n<!-- /#a -->', 'Applied `c` filter');
	});
	
	test('Escape (e)', function() {
		expand('a>b|e');
		equal(editorStub.getContent(), '&lt;a href=""&gt;&lt;b&gt;&lt;/b&gt;&lt;/a&gt;', 'Applied `e` filter');
	});
	
	test('Formatting and HTML filter (html)', function() {
		expand('div>p|html');
		equal(editorStub.getContent(), '<div>\n\t<p></p>\n</div>', 'Output block tags');
		
		expand('span>i|html');
		equal(editorStub.getContent(), '<span><i></i></span>', 'Output inline elements');
		
		expand('select>option*3|html');
		equal(editorStub.getContent(), '<select name="" id="">\n\t<option value=""></option>\n\t<option value=""></option>\n\t<option value=""></option>\n</select>', 'Special case for `select>option`');
		
		expand('div>i+p+b|html');
		equal(editorStub.getContent(), '<div>\n\t<i></i>\n\t<p></p>\n\t<b></b>\n</div>', 'Mixin inline and block elements');
		
		expand('div>i*3|html');
		equal(editorStub.getContent(), '<div>\n\t<i></i>\n\t<i></i>\n\t<i></i>\n</div>', 'Special case for many inline elements');
		
	});
	
	test('HAML (haml)', function() {
		expand('#header>ul.nav>li[title=test$]*2|haml');
		equal(editorStub.getContent(), '#header \n\t%ul.nav \n\t\t%li{:title => "test1"} \n\t\t%li{:title => "test2"} ', 'Applied `haml` filter');
	});
	
	test('Single line (s)', function() {
		expand('div>p|s');
		equal(editorStub.getContent(), '<div><p></p></div>', 'Applied `s` filter');
	});
	
	test('Trim list symbols (t)', function() {
		expand('{1. test}|t');
		equal(editorStub.getContent(), 'test', 'Removed `1.`');
		
		expand('{ 1 test}|t');
		equal(editorStub.getContent(), 'test', 'Removed ` 1`');
		
		expand('{ * test}|t');
		equal(editorStub.getContent(), 'test', 'Removed `*`');
	});
	
	test('XSL (xsl)', function() {
		var oldSyntax = editorStub.getSyntax();
		var oldProfile = editorStub.getProfileName();
		editorStub.setSyntax('xsl');
		editorStub.setProfileName('xml');
		
		expand('vare|xsl');
		equal(editorStub.getContent(), '<xsl:variable name="" select=""/>', 'Expanded variable template, no attribute removal');
		
		expand('vare>p|xsl');
		equal(editorStub.getContent(), '<xsl:variable name="">\n\t<p></p>\n</xsl:variable>', 'Expanded variable template, "select" attribute removed');
		
		editorStub.setSyntax(oldSyntax);
		editorStub.setProfileName(oldProfile);
	});
})();
