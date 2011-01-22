#!/usr/bin/env python
# -*- coding: utf-8 -*-
'''
Trim filter: removes characters at the beginning of the text
content that indicates lists: numbers, #, *, -, etc.
@author Sergey Chikuyonok (serge.che@gmail.com)
@link http://chikuyonok.ru
'''
import re
import zencoding

re_indicators = re.compile(r'^([\s|\u00a0])?[\d|#|\-|\*|\u2022]+\.?\s*')

@zencoding.filter('t')
def process(tree, profile):
	for item in tree.children:
		if item.content:
			item.content = re_indicators.sub('', item.content)
		
		process(item, profile)
	
	return tree