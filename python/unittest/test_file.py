'''
Created on May 12, 2010

@author: sergey
'''
import unittest
from zencoding import zen_core as zen
from zencoding import zen_file

class Test(unittest.TestCase):

	def testImageSize(self):
		size = {'width': 25, 'height': 25}
		
		self.assertEqual(size, zen.get_image_size(zen_file.read('./assets/sample.png')))
		self.assertEqual({'width': 125, 'height': 125}, zen.get_image_size(zen_file.read('./assets/sample2.png')))
		self.assertEqual(size, zen.get_image_size(zen_file.read('./assets/sample.gif')))
		self.assertEqual({'width': 300, 'height': 300}, zen.get_image_size(zen_file.read('./assets/sample2.gif')))
		self.assertEqual(size, zen.get_image_size(zen_file.read('./assets/sample.jpg')))


if __name__ == "__main__":
	#import sys;sys.argv = ['', 'Test.testFileRead']
	unittest.main()