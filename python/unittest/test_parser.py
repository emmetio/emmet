'''
Created on Dec 26, 2010

@author: sergey
'''
from zencoding import zen_parser

if __name__ == "__main__":
	print(zen_parser.parse('a.sample+b[title=Hello]>a+(span{Test}+div)+em'))
	print('=============')
	print(zen_parser.parse('a.sample+b[title=Hello]>a+(span{Test}+div+(a+b)+a)+em'))
	print('=============')
	print(zen_parser.parse('a.sample+b[title=Hello]>a+(span{Test}+div>(a>b)+a)+em'))
	print('=============')
