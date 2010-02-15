'''
Created on Jun 15, 2009

@author: sergey
'''
import unittest
from zencoding.zen_settings import zen_settings
from zencoding import stparser

class Test(unittest.TestCase):

	def testMaps(self):
		stparser.create_maps(zen_settings)
		self.assertEqual('area', zen_settings['html']['element_types']['empty'][0])
	
	def testParser(self):
		stparser.parse(zen_settings)
		el = zen_settings['html']['abbreviations']['a']
		self.assertEqual(stparser.TYPE_ABBREVIATION, el.type)
		self.assertEqual('a', el.key)
		self.assertEqual([{'name': 'href', 'value': ''}], el.value['attributes'])

	def testMerge(self):
		pass


if __name__ == "__main__":
	#import sys;sys.argv = ['', 'Test.testMerge']
	unittest.main()