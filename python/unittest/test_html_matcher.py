'''
Created on Oct 15, 2009

@author: sergey
'''
import unittest
from zencoding import html_matcher

xhtml_string = '<p><strong>Hello</strong> world <br /> to all <img src="/path/to/image.png" alt="" /> my <!-- enemies --> friends</p>';
xhtml_string2 = '<span><span><br /><img src="" alt="" /><span></span></span></span><strong><em>hello</em></strong> world';
xhtml_string3 = '<p>Lorem ipsum dolor sit <!-- Don\'t use <b> tag here --> <span>amet</span>, consectetur adipiscing elit. </p>';
html_string = '<p><b>Hello</b> world <br> to all <img src="/path/to/image.png" alt=""> my friends<p>Another paragraph';

xsl_string = '<xsl:if test="@output"><xsl:value-of select="one" /></xsl:if> <xsl:value-of select="two" /> <xsl:call-template name="tmpl1"/> <div><xsl:call-template name="tmpl2"/></div>';

class Test(unittest.TestCase):
	
	
	def testXhtml(self):
		self.assertEqual((11, 16), html_matcher.match(xhtml_string, 12));
		self.assertEqual((3, 25), html_matcher.match(xhtml_string, 8));
		self.assertEqual((32, 38), html_matcher.match(xhtml_string, 36));
		self.assertEqual((46, 85), html_matcher.match(xhtml_string, 70));
		self.assertEqual((3, 113), html_matcher.match(xhtml_string, 43));
		self.assertEqual((89, 105), html_matcher.match(xhtml_string, 99));
		
		self.assertEqual((12, 52), html_matcher.match(xhtml_string2, 39));
		self.assertEqual((6, 59), html_matcher.match(xhtml_string2, 52));
		self.assertEqual((6, 59), html_matcher.match(xhtml_string2, 57));
		self.assertEqual((0, 66), html_matcher.match(xhtml_string2, 3));
		self.assertEqual((39, 52), html_matcher.match(xhtml_string2, 45));
		self.assertEqual((66, 97), html_matcher.match(xhtml_string2, 95));

		self.assertEqual((23, 52), html_matcher.match(xsl_string, 32));
		self.assertEqual((62, 91), html_matcher.match(xsl_string, 76));
		
		self.assertEqual((3, 105), html_matcher.match(xhtml_string3, 77));
		self.assertEqual((25, 56), html_matcher.match(xhtml_string3, 49));


if __name__ == "__main__":
	#import sys;sys.argv = ['', 'Test.testHtmlMatched']
	unittest.main()