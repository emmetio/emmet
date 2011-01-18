'''
@author Sergey Chikuyonok (serge.che@gmail.com)
@link http://chikuyonok.ru
'''
from parser import CSSEX
from HTMLParser import HTMLParser

class MyHTMLParser(HTMLParser):
	def handle_starttag(self, tag, attrs):
		line, char = self.getpos()
		print('got %s at %d, %d' % (self.get_starttag_text(), char, line))
		
	def handle_startendtag(self, tag, attrs):
		line, char = self.getpos()
		print('got %s at %d, %d' % (self.get_starttag_text(), char, line))

tokens = CSSEX.lex('.item > #elem {position  :  relative  ;\nborder: 1px solid #000;\nbackground: url(image.png) #fff top left}')

for t in tokens:
	print(t)
	
html = MyHTMLParser()
html.feed('<span class="text"></span>\n<em></em>\n<img src=""        alt="" />')
