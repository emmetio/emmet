'''
Created on Jun 14, 2009

@author: sergey
'''
import unittest
import zencoding.utils
import zencoding.resources as zen_resources

test_obj = {
	'key1': {
		'key2': {
			'key3': 1
		}
	}
}

class TestDeepKey(unittest.TestCase):
	
	def testExistedByList(self):
		self.assertTrue(zen_resources.has_deep_key(test_obj, ['key1', 'key2', 'key3']))
		self.assertFalse(zen_resources.has_deep_key(test_obj, ['key1', 'key2', 'key4']))
		
	def testExistedByString(self):
		self.assertTrue(zen_resources.has_deep_key(test_obj, 'key1.key2.key3'))
		
	def testNotExistedByKey(self):
		self.assertFalse(zen_resources.has_deep_key(test_obj, ('key3', 'key1')))

	def testNotExistedTopLevel(self):
		self.assertFalse(zen_resources.has_deep_key(test_obj, 'key2'))
		
#	def testActions(self):
		self.assertTrue('2.65', zencoding.utils.prettify_number(2.65345))
		self.assertTrue('2', zencoding.utils.prettify_number(2.00065))


if __name__ == "__main__":
	#import sys;sys.argv = ['', 'Test.testDeepKey']
	unittest.main()