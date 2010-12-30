#!/usr/bin/env python
# -*- coding: utf-8 -*-
'''
Trim filter: removes characters at the beginning of the text
content that indicates lists: numbers, #, *, -, etc.
@author Sergey Chikuyonok (serge.che@gmail.com)
@link http://chikuyonok.ru
'''
import re

alias = 't'
"Filter name alias (if not defined, ZC will use module name)"

re_indicators = re.compile(r'^([\s|\u00a0])?[\d|#|\-|\*|\u2022]+\.?\s*')

def process(tree, profile):
	for item in tree.children:
		if item.content:
			item.content = re_indicators.sub(r'\1', item.content)
		
		process(item, profile)
	
	return tree