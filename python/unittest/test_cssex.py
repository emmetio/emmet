'''
@author Sergey Chikuyonok (serge.che@gmail.com)
@link http://chikuyonok.ru
'''
from parser import CSSEX
from parser import XML

#tokens = CSSEX.lex('.item > #elem {position  :  relative  ;\nborder: 1px solid #000;\nbackground: url(image.png) #fff top left}')
#
#for t in tokens:
#	print(t)
	
html_tokens = XML.parse('<span class="text"></span>\n<em></em>\n<img src=""        alt="" />')
i = 100
try:
	while i > 0:
		i -= 1
		t = html_tokens['next']()
		print('token: %s' % t)
		
		if not t:
			break
except XML.StopIteration:
	print('stopped')
