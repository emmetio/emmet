(function() {
	var caret = emmet.require('utils').getCaretPlaceholder();
	var moduleName = 'Abbreviation Expander Engine';
	
	module(moduleName);
	var userSettings = {
		'html': {
			'abbreviations': {
				'jq': '<scr' + 'ipt type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.3.2/jquery.min.js"></scr' + 'ipt>',
				'demo': '<div id="demo"></div>',
				'nav': 'ul.nav>li*>a'
			},
			'snippets': {
				'dol': '\\$db->connect()\n\t\\$\\$\\$more dollaz$',
				'erb': '<%= |${child} %>'
			}
		},
		'xml': {
			'abbreviations': {
				'use': '<use xlink:href=""/>'
			}
		}

	};
	
	QUnit.moduleStart(function(obj) {
		if (obj.name == moduleName) {
			emmet.require('utils').setCaretPlaceholder('|');
			emmet.require('resources').setVocabulary(userSettings, 'user');
		}
	});
	
	QUnit.moduleDone(function(obj) {
		if (obj.name == moduleName) {
			emmet.require('utils').setCaretPlaceholder(caret);
			emmet.require('resources').setVocabulary({}, 'user');
		}
	});
	
	function runTest() {
		var args = _.toArray(arguments);
		var params = _.initial(args);
		if (!params[2]) {
			params[2] = 'plain';
		}
		
		var result = emmet.expandAbbreviation.apply(emmet, params);
		result = emmet.require('tabStops').processText(result, {
			escape: function(ch) {
				return ch;
			},
			
			tabstop: function(data) {
				return data.placeholder || '';
			}
		});
		equal(result, _.last(args), args[0]);
	}
	
	test("'+' operator", function() {
		runTest('p+p', '<p></p><p></p>');
		runTest('p+P', '<p></p><P></P>');
		runTest('p.name+p+p', '<p class="name"></p><p></p><p></p>');
	});
	
	test("'>' operator", function() {
		runTest('p>em', '<p><em></em></p>');
		runTest('p.hello>em.world>span', '<p class="hello"><em class="world"><span></span></em></p>');
	});
	
	test("'^' operator", function() {
		runTest('p>em^div', '<p><em></em></p><div></div>');
		runTest('p>em>span^^div', '<p><em><span></span></em></p><div></div>');
		runTest('p>em>span^^^^div', '<p><em><span></span></em></p><div></div>');
	});
	
	test('Attributes', function() {
		runTest('p.name', '<p class="name"></p>');
		runTest('p.one.two.three', '<p class="one two three"></p>');
		runTest('p.one-two.three', '<p class="one-two three"></p>');
		runTest('p.one.two-three', '<p class="one two-three"></p>');
		runTest('p.one_two-three', '<p class="one_two-three"></p>');
		runTest('p#myid', '<p id="myid"></p>');
		runTest('p#myid.name_with-dash32.otherclass', '<p id="myid" class="name_with-dash32 otherclass"></p>');
		runTest('span.one.two.three', '<span class="one two three"></span>');
		
		runTest('span.one#two', '<span class="one" id="two"></span>');
		runTest('span.one.two#three', '<span class="one two" id="three"></span>');
		
		runTest('span[title]', '<span title=""></span>');
		runTest('span[title data]', '<span title="" data=""></span>');
		runTest('span.test[title data]', '<span class="test" title="" data=""></span>');
		runTest('span#one.two[title data]', '<span id="one" class="two" title="" data=""></span>');
		runTest('span[title=Hello]', '<span title="Hello"></span>');
		runTest('span[title="Hello world"]', '<span title="Hello world"></span>');
		runTest('span[title=\'Hello world\']', '<span title="Hello world"></span>');
		runTest('span[title="Hello world" data=other]', '<span title="Hello world" data="other"></span>');
		runTest('span[title="Hello world" data=other attr2 attr3]', '<span title="Hello world" data="other" attr2="" attr3=""></span>');
		runTest('span[title="Hello world" data=other attr2 attr3]>em', '<span title="Hello world" data="other" attr2="" attr3=""><em></em></span>');
		runTest('filelist[id=javascript.files]', '<filelist id="javascript.files"></filelist>');
	});
	
	test('Expandos', function() {
		runTest('dl+', '<dl><dt></dt><dd></dd></dl>');
		runTest('div+div>dl+', '<div></div><div><dl><dt></dt><dd></dd></dl></div>');
	});
	
	test('Counters', function() {
		runTest('ul#nav>li.item$*3', '<ul id="nav"><li class="item1"></li><li class="item2"></li><li class="item3"></li></ul>');
		runTest('ul#nav>li.item$$$*3', '<ul id="nav"><li class="item001"></li><li class="item002"></li><li class="item003"></li></ul>');
		runTest('ul#nav>li.$$item$$$*3', '<ul id="nav"><li class="01item001"></li><li class="02item002"></li><li class="03item003"></li></ul>');
		runTest('ul#nav>li.pre$*3+li.post$*3', '<ul id="nav"><li class="pre1"></li><li class="pre2"></li><li class="pre3"></li><li class="post1"></li><li class="post2"></li><li class="post3"></li></ul>');
		runTest('.sample$*3', '<div class="sample1"></div><div class="sample2"></div><div class="sample3"></div>');
		runTest('ul#nav>li{text}*3', '<ul id="nav"><li>text</li><li>text</li><li>text</li></ul>');
		
		// test counter base
		runTest('{$@3 }*3', '3 4 5 ');
		runTest('{$@- }*3', '3 2 1 ');
		runTest('{$@-5 }*3', '7 6 5 ');
	});
	
	test('User-defined settings', function() {
		runTest('jq', '<script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.3.2/jquery.min.js"></script>');
		runTest('demo', '<div id="demo"></div>');
	});
	
	test('Short tags', function() {
		runTest('bq>p', '<blockquote><p></p></blockquote>');
	});
	
	test('Tag match on abbreviaion extraction', function() {
		var actionUtils = emmet.require('actionUtils');
		equal(actionUtils.extractAbbreviation('<div>bq>p'), 'bq>p');
		equal(actionUtils.extractAbbreviation('<div class="hello" id="world">bq>p'), 'bq>p');
		equal(actionUtils.extractAbbreviation('<div some:extention="value">bq>p'), 'bq>p');
		
		
		var abbr = 'ul#nav>li.$$item$$$*3>a+span';
 		var abbr2 = 'table>tr>td[colspan=2 title="Hello world"]>span';
		equal(actionUtils.extractAbbreviation(abbr), abbr);
		equal(actionUtils.extractAbbreviation('<p>' +  abbr), abbr);
		equal(actionUtils.extractAbbreviation('hello ' + abbr), abbr);
		equal(actionUtils.extractAbbreviation('<div>' + abbr2), abbr2);
		equal(actionUtils.extractAbbreviation('hello ' + abbr2), abbr2);
	});
	
	test('Other patterns', function() {
		runTest('script', '<script></script>');
		runTest('script:src', '<script src=""></script>');
		runTest('img', '<img src="" alt="" />');
		runTest('input:c', '<input type="checkbox" name="" id="" />');
		runTest('some:elem', '<some:elem></some:elem>');
		runTest('li#id$.class$*3', '<li id="id1" class="class1"></li><li id="id2" class="class2"></li><li id="id3" class="class3"></li>');
		runTest('select#test', '<select name="" id="test"></select>');
		runTest('use', 'xml', 'plain', '<use xlink:href="" />');
	});
	
	test('XSL', function() {
		runTest('tmatch', 'xsl', 'plain', '<xsl:template match="" mode=""></xsl:template>');
		runTest('choose+', 'xsl', 'plain', '<xsl:choose><xsl:when test=""></xsl:when><xsl:otherwise></xsl:otherwise></xsl:choose>');
		runTest('xsl:variable>div+p', 'xsl', 'plain', '<xsl:variable><div></div><p></p></xsl:variable>');
		runTest('var>div+p', 'xsl', 'plain', '<xsl:variable name=""><div></div><p></p></xsl:variable>');
		runTest('ap', 'xsl', 'plain', '<xsl:apply-templates select="" mode="" />');
		runTest('ap>wp*2', 'xsl', 'plain', '<xsl:apply-templates select="" mode=""><xsl:with-param name="" select="" /><xsl:with-param name="" select="" /></xsl:apply-templates>');
	});
	
	test('CSS', function() {
		runTest('@i', 'css', '@import url(|);');
		runTest('!', 'css', '!important');
		runTest('pos:s', 'css', 'position: static;');
		runTest('ti:-', 'css', 'text-indent: -9999px;');
		runTest('bdb+', 'css', 'border-bottom: 1px solid #000;');
		runTest('p10+poa', 'css', 'xhtml', 'padding: 10px;\nposition: absolute;');
	});
	
	test('Inheritance', function() {
		runTest('a', 'xsl', 'plain', '<a href=""></a>');
		runTest('demo', 'xsl', 'plain', '<div id="demo"></div>');
	});
	
	test('Non-existing types', function() {
		runTest('a', 'foo', '<a></a>');
		runTest('bq>p', 'foo', '<bq><p></p></bq>');
	});
	
	test('Tag hit', function() {
		var editorUtils = emmet.require('editorUtils');
		
		ok(editorUtils.isInsideTag('hello<div>world', 7));
		ok(editorUtils.isInsideTag('hello<br />world', 7));
		ok(editorUtils.isInsideTag('hello</p>world', 7));
		ok(!editorUtils.isInsideTag('hello<div>world', 10));
		ok(!editorUtils.isInsideTag('hello<div>world', 1));
	});
	
	test('Formatting', function() {
		runTest('div>erb', 'html', 'xhtml', '<div>\n\t<%= | %>\n</div>');
		runTest('div>erb|bem', 'html', 'xhtml', '<div>\n\t<%= | %>\n</div>');
		runTest('span>erb', 'html', 'xhtml', '<span><%= | %></span>');
		
		runTest('bq>p', 'html', 'xhtml', '<blockquote>\n\t<p>|</p>\n</blockquote>');
		runTest('bq+p', 'html', 'xhtml', '<blockquote>|</blockquote>\n<p>|</p>');
		runTest('img+p', 'html', 'xhtml', '<img src="|" alt="|" />\n<p>|</p>');
		runTest('vare', 'xsl', 'xml', '<xsl:variable name="|" select="|"/>');
		runTest('vare+p', 'xsl', 'xml', '<xsl:variable name="|" select="|"/>\n<p>|</p>');
		
		runTest('div>span*2', 'html', 'xhtml', '<div><span>|</span><span>|</span></div>');
		runTest('div>span*3', 'html', 'xhtml', '<div>\n\t<span>|</span>\n\t<span>|</span>\n\t<span>|</span>\n</div>');
		runTest('span*2', 'html', 'xhtml', '<span>|</span><span>|</span>');
		runTest('span*3', 'html', 'xhtml', '<span>|</span>\n<span>|</span>\n<span>|</span>');
		runTest('span{hello world}+span{hello |world}', 'html', 'xhtml', '<span>|hello world</span><span>hello |world</span>');
	});
	
	test('Groups', function() {
		runTest('div#head+(p>p)+div#footer', '<div id="head"></div><p><p></p></p><div id="footer"></div>');
		runTest('div#head>((ul#nav>li*3)+(div.subnav>p)+(div.othernav))+div#footer', '<div id="head"><ul id="nav"><li></li><li></li><li></li></ul><div class="subnav"><p></p></div><div class="othernav"></div><div id="footer"></div></div>');
		runTest('div#head>(ul#nav>li*3>(div.subnav>p)+(div.othernav))+div#footer', '<div id="head"><ul id="nav"><li><div class="subnav"><p></p></div><div class="othernav"></div></li><li><div class="subnav"><p></p></div><div class="othernav"></div></li><li><div class="subnav"><p></p></div><div class="othernav"></div></li></ul><div id="footer"></div></div>');
		runTest('ul>li.pre$*2+(li.item$*4>a)+li.post$*2', '<ul><li class="pre1"></li><li class="pre2"></li><li class="item1"><a href=""></a></li><li class="item2"><a href=""></a></li><li class="item3"><a href=""></a></li><li class="item4"><a href=""></a></li><li class="post1"></li><li class="post2"></li></ul>');
		runTest('div>(i+b)*2+(span+em)*3', '<div><i></i><b></b><i></i><b></b><span></span><em></em><span></span><em></em><span></span><em></em></div>');
	});
	
	test('Group multiplication', function() {
		runTest('(span.i$)*3', '<span class="i1"></span><span class="i2"></span><span class="i3"></span>');
		runTest('p.p$*2>(i.i$+b.b$)*3', '<p class="p1"><i class="i1"></i><b class="b1"></b><i class="i2"></i><b class="b2"></b><i class="i3"></i><b class="b3"></b></p><p class="p2"><i class="i1"></i><b class="b1"></b><i class="i2"></i><b class="b2"></b><i class="i3"></i><b class="b3"></b></p>');
		runTest('(p.i$+ul>li.i$*2>span.s$)*3', '<p class="i1"></p><ul><li class="i1"><span class="s1"></span></li><li class="i2"><span class="s2"></span></li></ul><p class="i2"></p><ul><li class="i1"><span class="s1"></span></li><li class="i2"><span class="s2"></span></li></ul><p class="i3"></p><ul><li class="i1"><span class="s1"></span></li><li class="i2"><span class="s2"></span></li></ul>');
	});
	
	test('Escaping', function() {
		var utils = emmet.require('utils');
		equal(utils.escapeText('<xsl:apply-templates select="$item | other"/>'), '<xsl:apply-templates select="\\$item | other"/>');
		equal(utils.escapeText('<xsl:apply-templates select="item \\\\| other"/>'), '<xsl:apply-templates select="item \\\\\\\\| other"/>');
	});
	
	test('Unescaping', function() {
		var utils = emmet.require('utils');
		equal(utils.unescapeText('<xsl:apply-templates select="\\$item \\| other"/>'), '<xsl:apply-templates select="$item | other"/>');
		equal(utils.unescapeText('<xsl:apply-templates select="item \\\\\\\\\\| other"/>'), '<xsl:apply-templates select="item \\\\| other"/>');
	});
	
	test('Implied tag name', function() {
		runTest('#content', '<div id="content"></div>');
		runTest('.content', '<div class="content"></div>');
		runTest('#content.demo', '<div id="content" class="demo"></div>');
		runTest('.demo[title=test]', '<div class="demo" title="test"></div>');
		runTest('#some_id>.some_class', '<div id="some_id"><div class="some_class"></div></div>');
		runTest('ul>.item', '<ul><li class="item"></li></ul>');
		runTest('ol>.', '<ol><li class=""></li></ol>');
		runTest('em>.', '<em><span class=""></span></em>');
	});
	
	test('Dollar sign', function() {
		runTest('dol', '$db->connect()\n\t$$$more dollaz1');
	});
	
	test('Text nodes', function() {
		runTest('span>{Hello world}', '<span>Hello world</span>');
		runTest('span{Hello world}', '<span>Hello world</span>');
		runTest('span>{Hello}+{ world}', '<span>Hello world</span>');
		runTest('span>{Click }+(a[href=/url/]{here})+{ for more info}', '<span>Click <a href="/url/">here</a> for more info</span>');
	});
	
	test('Repeating elements in aliases', function() {
		runTest('nav*5', '<ul class="nav"><li><a href=""></a></li><li><a href=""></a></li><li><a href=""></a></li><li><a href=""></a></li><li><a href=""></a></li></ul>');
		runTest('div>nav*5>span', '<div><ul class="nav"><li><a href=""><span></span></a></li><li><a href=""><span></span></a></li><li><a href=""><span></span></a></li><li><a href=""><span></span></a></li><li><a href=""><span></span></a></li></ul></div>');
		runTest('nav', '<ul class="nav"><li><a href=""></a></li></ul>');
	});
})();