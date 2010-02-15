#!/usr/bin/env python
# -*- coding: utf-8 -*-
'''
Created on Jun 19, 2009

@author: sergey
'''
import unittest
import sys
from zencoding import zen_core as zen

zen.set_caret_placeholder('|')

def expandAbbr(abbr, doc_type='html', profile_name='plain'):
	return zen.expand_abbreviation(abbr, doc_type, profile_name)

def extractAbbr(line):
	return zen.extract_abbreviation(line)


def wrap(abbr, content):
	return zen.wrap_with_abbreviation(abbr, content)


class Test(unittest.TestCase):
	
	def testAbbreviationWrap(self):
		self.assertEqual('<p class="test">hello world</p>', wrap('p.test', 'hello world'));
		self.assertEqual('<p></p><p class="test">hello world</p>', wrap('p+p.test', 'hello world'));
		self.assertEqual('<ul id="nav" class="simple"><li>hello world</li></ul>', wrap('ul#nav.simple>li', 'hello world'));
		self.assertEqual('<ul id="nav" class="simple"><li>hello world</li><li>hello world</li></ul>', wrap('ul#nav.simple>li*2', 'hello world'));
		self.assertEqual('<li>one</li><li>two</li><li>three</li>', wrap('li*', 'one\ntwo\nthree'));
		self.assertEqual('<li><a href="">one</a></li><li><a href="">two</a></li><li><a href="">three</a></li>', wrap('li*>a', 'one\ntwo\nthree'));
		self.assertEqual(u'<li><a href="">раз</a></li><li><a href="">два</a></li><li><a href="">три</a></li>', wrap(u'li*>a', u'раз\nдва\nтри'));
	
	def testSnippetsWrap(self):
		self.assertEqual('<!--[if IE]>\n\thello world|\n<![endif]-->', wrap('cc:ie', 'hello world'));

if __name__ == "__main__":
	print sys.getdefaultencoding()
	#import sys;sys.argv = ['', 'Test.testAbbreviations']
	unittest.main()