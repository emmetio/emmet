'''
@author Sergey Chikuyonok (serge.che@gmail.com)
@link http://chikuyonok.ru
'''
from parser import utils

css = utils.parse_css('.item > #elem {position  :  relative  ;\nborder: 1px solid #000;\nbackground: url(image.png) #fff top left}', 15)
#for t in css:
#	print(t)

html = utils.parse_html('<span class="text">', 30)
#for t in html:
#	print(t)
	
print utils.extract_css_rule('.item > #elem {position  :  relative  ;\nborder: 1px solid #000;\nbackground: url(image.png) #fff top left}', 40, False)
	
#tokens = CSSEX.lex('.item > #elem {position  :  relative  ;\nborder: 1px solid #000;\nbackground: url(image.png) #fff top left}')
#
#for t in tokens:
#	print(t)
	
#html_tokens = XML.parse('<span class="text"></span>\n<em></em>\n<img src=""        alt="" />')
