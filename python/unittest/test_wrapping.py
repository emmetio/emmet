#!/usr/bin/env python
# -*- coding: utf-8 -*-
'''
Created on Jun 19, 2009

@author: sergey
'''
import unittest
import sys
import zencoding.utils

zencoding.utils.set_caret_placeholder('|')


def wrap(abbr, content):
	return zencoding.wrap_with_abbreviation(abbr, content)

class Test(unittest.TestCase):
	
	def testAbbreviationWrap(self):
		self.assertEqual('<p class="test">hello world</p>', wrap('p.test', 'hello world'));
		self.assertEqual('<p></p><p class="test">hello world</p>', wrap('p+p.test', 'hello world'));
		self.assertEqual('<ul id="nav" class="simple"><li>hello world</li></ul>', wrap('ul#nav.simple>li', 'hello world'));
		self.assertEqual('<ul id="nav" class="simple"><li>hello world</li><li>hello world</li></ul>', wrap('ul#nav.simple>li*2', 'hello world'));
		self.assertEqual('<li>one</li><li>two</li><li>three</li>', wrap('li*', 'one\ntwo\nthree'));
		self.assertEqual('<li><a href="">one</a></li><li><a href="">two</a></li><li><a href="">three</a></li>', wrap('li*>a', 'one\ntwo\nthree'));
		self.assertEqual(u'<li><a href="">раз</a></li><li><a href="">два</a></li><li><a href="">три</a></li>', wrap(u'li*>a', u'раз\nдва\nтри'));
		self.assertEqual('<ul><li><a href="" title="one"></a></li><li><a href="" title="two"></a></li><li><a href="" title="three"></a></li></ul>', wrap('ul>li*>a[title=${output}]', 'one\ntwo\nthree'));
		self.assertEqual('<ul><li><a href="" title="one">one</a></li><li><a href="" title="two">two</a></li><li><a href="" title="three">three</a></li></ul>', wrap('ul>li*>a[title=${output}]{${output}}', 'one\ntwo\nthree'));
	
	def testSnippetsWrap(self):
		self.assertEqual('<!--[if IE]>\n\thello world|\n<![endif]-->', wrap('cc:ie', 'hello world'));

if __name__ == "__main__":
	print sys.getdefaultencoding()
	#import sys;sys.argv = ['', 'Test.testAbbreviations']
	unittest.main()