'''
Created on Jun 19, 2009

@author: sergey
'''
import unittest

from zencoding import zen_core as zen
from zencoding import zen_resources

my_zen_settings = {
	'html': {
		'snippets': {
			'dol': '\\$db->connect()\n\t\\$\\$\\$more dollaz$'
		}
	}
}

zen.set_caret_placeholder('|')
zen_resources.set_vocabulary(my_zen_settings, zen_resources.VOC_USER)

def expandAbbr(abbr, syntax='html', profile_name='plain'):
	return zen.expand_abbreviation(abbr, syntax, profile_name)

def extractAbbr(line):
	return zen.extract_abbreviation(line)

class Test(unittest.TestCase):
	
	def testPlusOperator(self):
		self.assertEqual('<p></p><p></p>', expandAbbr('p+p'))
		self.assertEqual('<p></p><P></P>', expandAbbr('p+P'))
		self.assertEqual('<p class="name"></p><p></p><p></p>', expandAbbr('p.name+p+p'))
		
	def testChildOperator(self):
		self.assertEqual('<p><em></em></p>', expandAbbr('p>em'))
		self.assertEqual('<p class="hello"><em class="world"><span></span></em></p>', expandAbbr('p.hello>em.world>span'))
	
	def testAttributes(self):
		self.assertEqual('<p class="name"></p>', expandAbbr('p.name'))
		self.assertEqual('<p class="one two three"></p>', expandAbbr('p.one.two.three'))
		self.assertEqual('<p class="one-two three"></p>', expandAbbr('p.one-two.three'))
		self.assertEqual('<p class="one two-three"></p>', expandAbbr('p.one.two-three'))
		self.assertEqual('<p class="one_two-three"></p>', expandAbbr('p.one_two-three'))
		self.assertEqual('<p id="myid"></p>', expandAbbr('p#myid'))
		self.assertEqual('<p id="myid" class="name_with-dash32 otherclass"></p>', expandAbbr('p#myid.name_with-dash32.otherclass'))
		self.assertEqual('<span class="one two three"></span>', expandAbbr('span.one.two.three'))
		
		self.assertEqual('<span class="one" id="two"></span>', expandAbbr('span.one#two'))
		self.assertEqual('<span class="one two" id="three"></span>', expandAbbr('span.one.two#three'))
		
		self.assertEqual('<span title=""></span>', expandAbbr('span[title]'));
		self.assertEqual('<span title="" data=""></span>', expandAbbr('span[title data]'))
		self.assertEqual('<span class="test" title="" data=""></span>', expandAbbr('span.test[title data]'))
		self.assertEqual('<span id="one" class="two" title="" data=""></span>', expandAbbr('span#one.two[title data]'))
		self.assertEqual('<span title="Hello"></span>', expandAbbr('span[title=Hello]'))
		self.assertEqual('<span title="Hello world"></span>', expandAbbr('span[title="Hello world"]'))
		self.assertEqual('<span title="Hello world"></span>', expandAbbr('span[title=\'Hello world\']'))
		self.assertEqual('<span title="Hello world" data="other"></span>', expandAbbr('span[title="Hello world" data=other]'))
		self.assertEqual('<span title="Hello world" data="other" attr2="" attr3=""></span>', expandAbbr('span[title="Hello world" data=other attr2 attr3]'))
		self.assertEqual('<span title="Hello world" data="other" attr2="" attr3=""><em></em></span>', expandAbbr('span[title="Hello world" data=other attr2 attr3]>em'))
		self.assertEqual('<filelist id="javascript.files"></filelist>', expandAbbr('filelist[id=javascript.files]'));
		
	def testExpandos(self):
		self.assertEqual('<dl><dt></dt><dd></dd></dl>', expandAbbr('dl+'))
		self.assertEqual('<table><tr><td></td></tr></table>', expandAbbr('table+'))
		self.assertEqual('<div></div><div><dl><dt></dt><dd></dd></dl></div>', expandAbbr('div+div>dl+'))
	
	def testCounters(self):
		self.assertEqual('<ul id="nav"><li class="item1"></li><li class="item2"></li><li class="item3"></li></ul>', expandAbbr('ul#nav>li.item$*3'))
		self.assertEqual('<ul id="nav"><li class="item001"></li><li class="item002"></li><li class="item003"></li></ul>', expandAbbr('ul#nav>li.item$$$*3'));
		self.assertEqual('<ul id="nav"><li class="01item001"></li><li class="02item002"></li><li class="03item003"></li></ul>', expandAbbr('ul#nav>li.$$item$$$*3'));
		self.assertEqual('<ul id="nav"><li class="pre1"></li><li class="pre2"></li><li class="pre3"></li><li class="post1"></li><li class="post2"></li><li class="post3"></li></ul>', expandAbbr('ul#nav>li.pre$*3+li.post$*3'));
		self.assertEqual('<div class="sample1"></div><div class="sample2"></div><div class="sample3"></div>', expandAbbr('.sample$*3'))
		self.assertEqual('<ul id="nav"><li>text</li><li>text</li><li>text</li></ul>', expandAbbr('ul#nav>li{text}*3'));
		
	def testShortTags(self):
		self.assertEqual('<blockquote><p></p></blockquote>', expandAbbr('bq>p'))
		
	def testTagMatch(self):
		self.assertEqual('bq>p', extractAbbr('<div>bq>p'))
		self.assertEqual('bq>p', extractAbbr('<div class="hello" id="world">bq>p'))
		self.assertEqual('bq>p', extractAbbr('<div some:extention="value">bq>p'))
		
	def testMiscPatters(self):
		self.assertEqual('<script type="text/javascript"></script>', expandAbbr('script'))
		self.assertEqual('<script type="text/javascript" src=""></script>', expandAbbr('script:src'))
		self.assertEqual('<img src="" alt="" />', expandAbbr('img'))
		self.assertEqual('<input type="checkbox" name="" id="" />', expandAbbr('input:c'))
		self.assertEqual('<some:elem></some:elem>', expandAbbr('some:elem'))
		self.assertEqual('<li id="id1" class="class1"></li><li id="id2" class="class2"></li><li id="id3" class="class3"></li>', expandAbbr('li#id$.class$*3'))
		self.assertEqual('<select name="" id="test"></select>', expandAbbr('select#test'));
		
	def testXSL(self):
		self.assertEqual('<xsl:template match="" mode=""></xsl:template>', expandAbbr('tmatch', 'xsl'))
		self.assertEqual('<xsl:choose><xsl:when test=""></xsl:when><xsl:otherwise></xsl:otherwise></xsl:choose>', expandAbbr('choose+', 'xsl'))
		self.assertEqual('<xsl:variable><div></div><p></p></xsl:variable>', expandAbbr('xsl:variable>div+p', 'xsl'))
		self.assertEqual('<xsl:variable name=""><div></div><p></p></xsl:variable>', expandAbbr('var>div+p', 'xsl'))
		self.assertEqual('<xsl:apply-templates select="" mode="" />', expandAbbr('ap', 'xsl'));
		self.assertEqual('<xsl:apply-templates select="" mode=""><xsl:with-param name="" select="" /><xsl:with-param name="" select="" /></xsl:apply-templates>', expandAbbr('ap>wp*2', 'xsl'));
		
	def testCSS(self):
		self.assertEqual('@import url(|);', expandAbbr('@i', 'css'))
		self.assertEqual('!important', expandAbbr('!', 'css'))
		self.assertEqual('position:static;', expandAbbr('pos:s', 'css'))
		self.assertEqual('text-indent:-9999px;', expandAbbr('ti:-', 'css'))
		self.assertEqual('border-bottom:1px solid #000;', expandAbbr('bdb+', 'css'))
	
	def testInheritance(self):
		self.assertEqual('<a href=""></a>', expandAbbr('a', 'xsl'))
		
	def testNonExistedTypes(self):
		self.assertEqual('<a></a>', expandAbbr('a', 'foo'))
		self.assertEqual('<bq><p></p></bq>', expandAbbr('bq>p', 'foo'))
	
	def testTagHit(self):
		self.assertEqual(True, zen.is_inside_tag('hello<div>world', 7))
		self.assertEqual(True, zen.is_inside_tag('hello<br />world', 7))
		self.assertEqual(True, zen.is_inside_tag('hello</p>world', 7))
		self.assertEqual(False, zen.is_inside_tag('hello<div>world', 10))
		self.assertEqual(False, zen.is_inside_tag('hello<div>world', 1))
		
	def testFormatting(self):
		self.assertEqual('<blockquote>\n\t<p>|</p>\n</blockquote>', expandAbbr('bq>p', 'html', 'xhtml'));
		self.assertEqual('<blockquote>|</blockquote>\n<p>|</p>', expandAbbr('bq+p', 'html', 'xhtml'));
		self.assertEqual('<img src="|" alt="|" />\n<p>|</p>', expandAbbr('img+p', 'html', 'xhtml'));
		self.assertEqual('<xsl:variable name="|" select="|"/>', expandAbbr('vare', 'xsl', 'xml'));
		self.assertEqual('<xsl:variable name="|" select="|"/>\n<p>\n\t|\n</p>', expandAbbr('vare+p', 'xsl', 'xml'));
		
		self.assertEqual('<div><span>|</span><span>|</span></div>', expandAbbr('div>span*2', 'html', 'xhtml'))
		self.assertEqual('<div>\n\t<span>|</span>\n\t<span>|</span>\n\t<span>|</span>\n</div>', expandAbbr('div>span*3', 'html', 'xhtml'))
		self.assertEqual('<span>|</span><span>|</span>', expandAbbr('span*2', 'html', 'xhtml'))
		self.assertEqual('<span>|</span>\n<span>|</span>\n<span>|</span>', expandAbbr('span*3', 'html', 'xhtml'))
		self.assertEqual('<span>|hello world</span><span>hello |world</span>', expandAbbr('span{hello world}+span{hello |world}', 'html', 'xhtml'))
		
	def testGroups(self):
		self.assertEqual('<div id="head"></div><p><p></p></p><div id="footer"></div>', expandAbbr('div#head+(p>p)+div#footer'));
		self.assertEqual('<div id="head"><ul id="nav"><li></li><li></li><li></li></ul><div class="subnav"><p></p></div><div class="othernav"></div><div id="footer"></div></div>', expandAbbr('div#head>((ul#nav>li*3)+(div.subnav>p)+(div.othernav))+div#footer'));
		self.assertEqual('<div id="head"><ul id="nav"><li><div class="subnav"><p></p></div><div class="othernav"></div></li><li><div class="subnav"><p></p></div><div class="othernav"></div></li><li><div class="subnav"><p></p></div><div class="othernav"></div></li></ul><div id="footer"></div></div>', expandAbbr('div#head>(ul#nav>li*3>(div.subnav>p)+(div.othernav))+div#footer'));
		self.assertEqual('<ul><li class="pre1"></li><li class="pre2"></li><li class="item1"><a href=""></a></li><li class="item2"><a href=""></a></li><li class="item3"><a href=""></a></li><li class="item4"><a href=""></a></li><li class="post1"></li><li class="post2"></li></ul>', expandAbbr('ul>li.pre$*2+(li.item$*4>a)+li.post$*2'));
		self.assertEqual('<div><i></i><b></b><i></i><b></b><span></span><em></em><span></span><em></em><span></span><em></em></div>', expandAbbr('div>(i+b)*2+(span+em)*3'));
		
	def testEscaping(self):
		self.assertEqual('<xsl:apply-templates select="\\$item \\| other"/>', zen.escape_text('<xsl:apply-templates select="$item | other"/>'))
		self.assertEqual('<xsl:apply-templates select="item \\\\\\\\\\| other"/>', zen.escape_text('<xsl:apply-templates select="item \\\\| other"/>'))
		
	def testUnescaping(self):
		self.assertEqual('<xsl:apply-templates select="$item | other"/>', zen.unescape_text('<xsl:apply-templates select="\\$item \\| other"/>'))
		self.assertEqual('<xsl:apply-templates select="item \\\\| other"/>', zen.unescape_text('<xsl:apply-templates select="item \\\\\\\\\\| other"/>'))
	
	def testExtract(self):
		abbr = 'ul#nav>li.$$item$$$*3>a+span'
		abbr2 = 'table>tr>td[colspan=2 title="Hello world"]>span'
		
		self.assertEqual(abbr, zen.extract_abbreviation(abbr));
		self.assertEqual(abbr, zen.extract_abbreviation('<p>' +  abbr))
		self.assertEqual(abbr, zen.extract_abbreviation('hello ' + abbr))
		self.assertEqual(abbr2, zen.extract_abbreviation('<div>' + abbr2))
		self.assertEqual(abbr2, zen.extract_abbreviation('hello ' + abbr2))
	
	def testShortNotation(self):
		self.assertEqual('<div id="content"></div>', expandAbbr('#content'))
		self.assertEqual('<div class="content"></div>', expandAbbr('.content'))
		self.assertEqual('<div id="content" class="demo"></div>', expandAbbr('#content.demo'))
		self.assertEqual('<div class="demo" title="test"></div>', expandAbbr('.demo[title=test]'))
		self.assertEqual('<div id="some_id"><div class="some_class"></div></div>', expandAbbr('#some_id>.some_class'));
	
	def testFilters(self):
		self.assertEqual('&lt;div id="content"&gt;&lt;/div&gt;', expandAbbr('#content|e'))
		self.assertEqual('&amp;lt;div id="content"&amp;gt;&amp;lt;/div&amp;gt;', expandAbbr('#content|e|e'))
		
		self.assertEqual('float: right;', expandAbbr('fl:r|fc', 'css'))
		self.assertEqual('float: right;\ndisplay: none;', expandAbbr('fl:r+d:n|fc', 'css'))
	
	def testDollarSign(self):
		self.assertEqual('$db->connect()\n\t$$$more dollaz1', expandAbbr('dol'));
		
	def testTextNodes(self):
		self.assertEqual('<span>Hello world</span>', expandAbbr('span>{Hello world}'));
		self.assertEqual('<span>Hello world</span>', expandAbbr('span{Hello world}'));
		self.assertEqual('<span>Hello world</span>', expandAbbr('span>{Hello}+{ world}'));
		self.assertEqual('<span>Click <a href="/url/">here</a> for more info</span>', expandAbbr('span>{Click }+(a[href=/url/]{here})+{ for more info}'));

if __name__ == "__main__":
	#import sys;sys.argv = ['', 'Test.testAbbreviations']
	unittest.main()