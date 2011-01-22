'''
Created on Dec 26, 2010

@author: sergey
'''
from zencoding.parser.abbreviation import parse

if __name__ == "__main__":
	print(parse('a.sample+b[title=Hello]>a+(span{Test}+div)+em'))
	print('=============')
	print(parse('a.sample+b[title=Hello]>a+(span{Test}+div+(a+b)+a)+em'))
	print('=============')
	print(parse('a.sample+b[title=Hello]>a+(span{Test}+div>(a>b)+a)+em'))
	print('=============')
