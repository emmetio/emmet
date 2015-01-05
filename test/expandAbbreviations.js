var assert = require('assert');
var editor = require('./stubs/editor');
var parser = require('../lib/parser/abbreviation');
var resources = require('../lib/assets/resources');
var tabStops = require('../lib/assets/tabStops');
var utils = require('../lib/utils/common');
var actionUtils = require('../lib/utils/action');
var editorUtils = require('../lib/utils/editor');

describe('Abbreviation Expander engine', function() {
	var userSettings = {
		'html': {
			'abbreviations': {
				'jq': '<scr' + 'ipt type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.3.2/jquery.min.js"></scr' + 'ipt>',
				'demo': '<div id="demo"></div>',
				'nav': 'ul.nav>li*>a',
				'al': '<a !href="http://|">',
				'f1|f2': '<demo>'
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
	var caret = utils.getCaretPlaceholder();

	function expand(abbr, options) {
		options = utils.extend({profile: 'plain'}, options || {});
		return tabStops.processText(parser.expand(abbr, options), {
			escape: function(ch) {
				return ch;
			},
			
			tabstop: function(data) {
				return data.placeholder || '';
			}
		});
	}

	before(function() {
		utils.setCaretPlaceholder('|');
		resources.setVocabulary(userSettings, 'user');
	});

	after(function() {
		utils.setCaretPlaceholder(caret);
		resources.setVocabulary({}, 'user');
	});

	it("'+' operator", function() {
		assert.equal(expand('p+p'), '<p></p><p></p>');
		assert.equal(expand('p+P'), '<p></p><P></P>');
		assert.equal(expand('p.name+p+p'), '<p class="name"></p><p></p><p></p>');
	});

	it("'>' operator", function() {
		assert.equal(expand('p>em'), '<p><em></em></p>');
		assert.equal(expand('p.hello>em.world>span'), '<p class="hello"><em class="world"><span></span></em></p>');
	});

	it("'^' operator", function() {
		assert.equal(expand('p>em^div'), '<p><em></em></p><div></div>');
		assert.equal(expand('p>em>span^^div'), '<p><em><span></span></em></p><div></div>');
		assert.equal(expand('p>em>span^^^^div'), '<p><em><span></span></em></p><div></div>');
	});

	it('Attributes', function() {
		assert.equal(expand('p.name'), '<p class="name"></p>');
		assert.equal(expand('p.one.two.three'), '<p class="one two three"></p>');
		assert.equal(expand('p.one-two.three'), '<p class="one-two three"></p>');
		assert.equal(expand('p.one.two-three'), '<p class="one two-three"></p>');
		assert.equal(expand('p.one_two-three'), '<p class="one_two-three"></p>');
		assert.equal(expand('p#myid'), '<p id="myid"></p>');
		assert.equal(expand('p#myid.name_with-dash32.otherclass'), '<p id="myid" class="name_with-dash32 otherclass"></p>');
		assert.equal(expand('span.one.two.three'), '<span class="one two three"></span>');
		
		assert.equal(expand('span.one#two'), '<span class="one" id="two"></span>');
		assert.equal(expand('span.one.two#three'), '<span class="one two" id="three"></span>');
		
		assert.equal(expand('span[title]'), '<span title=""></span>');
		assert.equal(expand('span[title data]'), '<span title="" data=""></span>');
		assert.equal(expand('span.test[title data]'), '<span class="test" title="" data=""></span>');
		assert.equal(expand('span#one.two[title data]'), '<span id="one" class="two" title="" data=""></span>');
		assert.equal(expand('span[title=Hello]'), '<span title="Hello"></span>');
		assert.equal(expand('span[title="Hello world"]'), '<span title="Hello world"></span>');
		assert.equal(expand('span[title=\'Hello world\']'), '<span title="Hello world"></span>');
		assert.equal(expand('span[title="Hello world" data=other]'), '<span title="Hello world" data="other"></span>');
		assert.equal(expand('span[title="Hello world" data=other attr2 attr3]'), '<span title="Hello world" data="other" attr2="" attr3=""></span>');
		assert.equal(expand('span[title="Hello world" data=other attr2 attr3]>em'), '<span title="Hello world" data="other" attr2="" attr3=""><em></em></span>');
		assert.equal(expand('filelist[id=javascript.files]'), '<filelist id="javascript.files"></filelist>');
	});

	it('Default attributes', function() {
		assert.equal(expand('a["text.html"]'), '<a href="text.html"></a>');
		assert.equal(expand('a[\'text.html\']'), '<a href="text.html"></a>');
		assert.equal(expand('a[text.html]'), '<a href="text.html"></a>');
		assert.equal(expand('a[http://google.com title=Google]'), '<a href="http://google.com" title="Google"></a>');
		assert.equal(expand('a[title=Google http://google.com]'), '<a href="http://google.com" title="Google"></a>');
		assert.equal(expand('img[image.png]'), '<img src="image.png" alt="" />');
		assert.equal(expand('link[style.css]'), '<link rel="stylesheet" href="style.css" />');

		// tesing implied atributes
		assert.equal(expand('script'), '<script></script>');
		assert.equal(expand('script[src]'), '<script src=""></script>');
		assert.equal(expand('script[file.js]'), '<script src="file.js"></script>');
		assert.equal(expand('script[/packages/requiejs/require.js]'), '<script src="/packages/requiejs/require.js"></script>');

		assert.equal(expand('al'), '<a></a>');
		assert.equal(expand('al[file.html]'), '<a href="http://file.html"></a>');
	});

	it('Boolean attributes', function() {
		assert.equal(expand('b[a.]'), '<b a="a"></b>');
		assert.equal(expand('b[contenteditable]'), '<b contenteditable="contenteditable"></b>', 'Handle default boolean attributes from preferences');
		assert.equal(expand('b[contenteditable]', {profile: 'html'}), '<b contenteditable>|</b>', 'Output compact boolean notation');
		assert.equal(expand('div.editor[a. title=test]', {profile: 'html'}), '<div class="editor" a title="test">|</div>');
	});

	it('Expandos', function() {
		assert.equal(expand('dl+'), '<dl><dt></dt><dd></dd></dl>');
		assert.equal(expand('div+div>dl+'), '<div></div><div><dl><dt></dt><dd></dd></dl></div>');
	});

	it('Counters', function() {
		assert.equal(expand('ul#nav>li.item$*3'), '<ul id="nav"><li class="item1"></li><li class="item2"></li><li class="item3"></li></ul>');
		assert.equal(expand('ul#nav>li.item$$$*3'), '<ul id="nav"><li class="item001"></li><li class="item002"></li><li class="item003"></li></ul>');
		assert.equal(expand('ul#nav>li.$$item$$$*3'), '<ul id="nav"><li class="01item001"></li><li class="02item002"></li><li class="03item003"></li></ul>');
		assert.equal(expand('ul#nav>li.pre$*3+li.post$*3'), '<ul id="nav"><li class="pre1"></li><li class="pre2"></li><li class="pre3"></li><li class="post1"></li><li class="post2"></li><li class="post3"></li></ul>');
		assert.equal(expand('.sample$*3'), '<div class="sample1"></div><div class="sample2"></div><div class="sample3"></div>');
		assert.equal(expand('ul#nav>li{text}*3'), '<ul id="nav"><li>text</li><li>text</li><li>text</li></ul>');
		
		// test counter base
		assert.equal(expand('{$@3 }*3'), '3 4 5 ');
		assert.equal(expand('{$@- }*3'), '3 2 1 ');
		assert.equal(expand('{$@-5 }*3'), '7 6 5 ');
	});

	it('User-defined settings', function() {
		assert.equal(expand('jq'), '<script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.3.2/jquery.min.js"></script>');
		assert.equal(expand('demo'), '<div id="demo"></div>');
		assert.equal(expand('f1'), '<demo></demo>');
		assert.equal(expand('f2'), '<demo></demo>');
	});

	it('Short tags', function() {
		assert.equal(expand('bq>p'), '<blockquote><p></p></blockquote>');
	});

	it('Tag match on abbreviaion extraction', function() {
		assert.equal(actionUtils.extractAbbreviation('<div>bq>p'), 'bq>p');
		assert.equal(actionUtils.extractAbbreviation('<div class="hello" id="world">bq>p'), 'bq>p');
		assert.equal(actionUtils.extractAbbreviation('<div some:extention="value">bq>p'), 'bq>p');
		
		
		var abbr = 'ul#nav>li.$$item$$$*3>a+span';
 		var abbr2 = 'table>tr>td[colspan=2 title="Hello world"]>span';
		assert.equal(actionUtils.extractAbbreviation(abbr), abbr);
		assert.equal(actionUtils.extractAbbreviation('<p>' +  abbr), abbr);
		assert.equal(actionUtils.extractAbbreviation('hello ' + abbr), abbr);
		assert.equal(actionUtils.extractAbbreviation('<div>' + abbr2), abbr2);
		assert.equal(actionUtils.extractAbbreviation('hello ' + abbr2), abbr2);
	});

	it('Other patterns', function() {
		assert.equal(expand('script'), '<script></script>');
		assert.equal(expand('script:src'), '<script src=""></script>');
		assert.equal(expand('img'), '<img src="" alt="" />');
		assert.equal(expand('input:c'), '<input type="checkbox" name="" id="" />');
		assert.equal(expand('some:elem'), '<some:elem></some:elem>');
		assert.equal(expand('li#id$.class$*3'), '<li id="id1" class="class1"></li><li id="id2" class="class2"></li><li id="id3" class="class3"></li>');
		assert.equal(expand('select#test'), '<select name="" id="test"></select>');
		assert.equal(expand('use', {syntax: 'xml'}), '<use xlink:href="" />');
	});

	it('XSL', function() {
		var opt = {syntax: 'xsl'};
		assert.equal(expand('tmatch', opt), '<xsl:template match="" mode=""></xsl:template>');
		assert.equal(expand('choose+', opt), '<xsl:choose><xsl:when test=""></xsl:when><xsl:otherwise></xsl:otherwise></xsl:choose>');
		assert.equal(expand('xsl:variable>div+p', opt), '<xsl:variable><div></div><p></p></xsl:variable>');
		assert.equal(expand('var>div+p', opt), '<xsl:variable name=""><div></div><p></p></xsl:variable>');
		assert.equal(expand('ap', opt), '<xsl:apply-templates select="" mode="" />');
		assert.equal(expand('ap>wp*2', opt), '<xsl:apply-templates select="" mode=""><xsl:with-param name="" select="" /><xsl:with-param name="" select="" /></xsl:apply-templates>');
	});

	it('CSS', function() {
		var opt = {syntax: 'css', profile: 'xhtml'};
		assert.equal(expand('@i', opt), '@import url(|);');
		assert.equal(expand('!', opt), '!important');
		assert.equal(expand('pos:s', opt), 'position: static;');
		assert.equal(expand('ti:-', opt), 'text-indent: -9999px;');
		assert.equal(expand('bdb+', opt), 'border-bottom: 1px solid #000;');
		assert.equal(expand('p10+poa', opt), 'padding: 10px;\nposition: absolute;');
	});

	it('Inheritance', function() {
		var opt = {syntax: 'xsl'};
		assert.equal(expand('a'), '<a href=""></a>');
		assert.equal(expand('demo'), '<div id="demo"></div>');
	});

	it('Non-existing types', function() {
		var opt = {syntax: 'foo'};
		assert.equal(expand('a', opt), '<a></a>');
		assert.equal(expand('bq>p', opt), '<bq><p></p></bq>');
	});

	it('Tag hit', function() {
		assert.ok(editorUtils.isInsideTag('hello<div>world', 7));
		assert.ok(editorUtils.isInsideTag('hello<br />world', 7));
		assert.ok(editorUtils.isInsideTag('hello</p>world', 7));
		assert.ok(!editorUtils.isInsideTag('hello<div>world', 10));
		assert.ok(!editorUtils.isInsideTag('hello<div>world', 1));
	});

	it('Formatting', function() {
		var html = {syntax: 'html', profile: 'xhtml'};
		var xsl = {syntax: 'xsl', profile: 'xml'};

		assert.equal(expand('div>erb', html), '<div>\n\t<%= | %>\n</div>');
		assert.equal(expand('div>erb|bem', html), '<div>\n\t<%= | %>\n</div>');
		assert.equal(expand('span>erb', html), '<span><%= | %></span>');
		
		assert.equal(expand('bq>p', html), '<blockquote>\n\t<p>|</p>\n</blockquote>');
		assert.equal(expand('bq+p', html), '<blockquote>|</blockquote>\n<p>|</p>');
		assert.equal(expand('img+p', html), '<img src="|" alt="|" />\n<p>|</p>');
		assert.equal(expand('vare', xsl), '<xsl:variable name="|" select="|"/>');
		assert.equal(expand('vare+p', xsl), '<xsl:variable name="|" select="|"/>\n<p>|</p>');
		
		assert.equal(expand('div>span*2', html), '<div><span>|</span><span>|</span></div>');
		assert.equal(expand('div>span*3', html), '<div>\n\t<span>|</span>\n\t<span>|</span>\n\t<span>|</span>\n</div>');
		assert.equal(expand('span*2', html), '<span>|</span><span>|</span>');
		assert.equal(expand('span*3', html), '<span>|</span>\n<span>|</span>\n<span>|</span>');
		assert.equal(expand('span{hello world}+span{hello |world}', html), '<span>|hello world</span><span>hello |world</span>');
	});

	it('Groups', function() {
		assert.equal(expand('div#head+(p>p)+div#footer'), '<div id="head"></div><p><p></p></p><div id="footer"></div>');
		assert.equal(expand('div#head>((ul#nav>li*3)+(div.subnav>p)+(div.othernav))+div#footer'), '<div id="head"><ul id="nav"><li></li><li></li><li></li></ul><div class="subnav"><p></p></div><div class="othernav"></div><div id="footer"></div></div>');
		assert.equal(expand('div#head>(ul#nav>li*3>(div.subnav>p)+(div.othernav))+div#footer'), '<div id="head"><ul id="nav"><li><div class="subnav"><p></p></div><div class="othernav"></div></li><li><div class="subnav"><p></p></div><div class="othernav"></div></li><li><div class="subnav"><p></p></div><div class="othernav"></div></li></ul><div id="footer"></div></div>');
		assert.equal(expand('ul>li.pre$*2+(li.item$*4>a)+li.post$*2'), '<ul><li class="pre1"></li><li class="pre2"></li><li class="item1"><a href=""></a></li><li class="item2"><a href=""></a></li><li class="item3"><a href=""></a></li><li class="item4"><a href=""></a></li><li class="post1"></li><li class="post2"></li></ul>');
		assert.equal(expand('div>(i+b)*2+(span+em)*3'), '<div><i></i><b></b><i></i><b></b><span></span><em></em><span></span><em></em><span></span><em></em></div>');
	});

	it('Group multiplication', function() {
		assert.equal(expand('(span.i$)*3'), '<span class="i1"></span><span class="i2"></span><span class="i3"></span>');
		assert.equal(expand('p.p$*2>(i.i$+b.b$)*3'), '<p class="p1"><i class="i1"></i><b class="b1"></b><i class="i2"></i><b class="b2"></b><i class="i3"></i><b class="b3"></b></p><p class="p2"><i class="i1"></i><b class="b1"></b><i class="i2"></i><b class="b2"></b><i class="i3"></i><b class="b3"></b></p>');
		assert.equal(expand('(p.i$+ul>li.i$*2>span.s$)*3'), '<p class="i1"></p><ul><li class="i1"><span class="s1"></span></li><li class="i2"><span class="s2"></span></li></ul><p class="i2"></p><ul><li class="i1"><span class="s1"></span></li><li class="i2"><span class="s2"></span></li></ul><p class="i3"></p><ul><li class="i1"><span class="s1"></span></li><li class="i2"><span class="s2"></span></li></ul>');
	});

	it('Escaping', function() {
		assert.equal(utils.escapeText('<xsl:apply-templates select="$item | other"/>'), '<xsl:apply-templates select="\\$item | other"/>');
		assert.equal(utils.escapeText('<xsl:apply-templates select="item \\\\| other"/>'), '<xsl:apply-templates select="item \\\\\\\\| other"/>');
	});
	
	it('Unescaping', function() {
		assert.equal(utils.unescapeText('<xsl:apply-templates select="\\$item \\| other"/>'), '<xsl:apply-templates select="$item | other"/>');
		assert.equal(utils.unescapeText('<xsl:apply-templates select="item \\\\\\\\\\| other"/>'), '<xsl:apply-templates select="item \\\\| other"/>');
	});
	
	it('Implied tag name', function() {
		assert.equal(expand('#content'), '<div id="content"></div>');
		assert.equal(expand('.content'), '<div class="content"></div>');
		assert.equal(expand('#content.demo'), '<div id="content" class="demo"></div>');
		assert.equal(expand('.demo[title=test]'), '<div class="demo" title="test"></div>');
		assert.equal(expand('#some_id>.some_class'), '<div id="some_id"><div class="some_class"></div></div>');
		assert.equal(expand('ul>.item'), '<ul><li class="item"></li></ul>');
		assert.equal(expand('ol>.'), '<ol><li class=""></li></ol>');
		assert.equal(expand('em>.'), '<em><span class=""></span></em>');
	});
	
	it('Dollar sign', function() {
		assert.equal(expand('dol'), '$db->connect()\n\t$$$more dollaz1');
	});
	
	it('Text nodes', function() {
		assert.equal(expand('span>{Hello world}'), '<span>Hello world</span>');
		assert.equal(expand('span{Hello world}'), '<span>Hello world</span>');
		assert.equal(expand('span>{Hello}+{ world}'), '<span>Hello world</span>');
		assert.equal(expand('span>{Click }+(a[href=/url/]{here})+{ for more info}'), '<span>Click <a href="/url/">here</a> for more info</span>');
		assert.equal(expand('str{Text}'), '<strong>Text</strong>');
	});
	
	it('Repeating elements in aliases', function() {
		assert.equal(expand('nav*5'), '<ul class="nav"><li><a href=""></a></li><li><a href=""></a></li><li><a href=""></a></li><li><a href=""></a></li><li><a href=""></a></li></ul>');
		assert.equal(expand('div>nav*5>span'), '<div><ul class="nav"><li><a href=""><span></span></a></li><li><a href=""><span></span></a></li><li><a href=""><span></span></a></li><li><a href=""><span></span></a></li><li><a href=""><span></span></a></li></ul></div>');
		assert.equal(expand('nav'), '<ul class="nav"><li><a href=""></a></li></ul>');
		assert.equal(expand('str*3'), '<strong></strong><strong></strong><strong></strong>');
	});
});
