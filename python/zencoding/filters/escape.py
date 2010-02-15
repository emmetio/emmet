#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''
Filter for escaping unsafe XML characters: <, >, &
@author Sergey Chikuyonok (serge.che@gmail.com)
@link http://chikuyonok.ru
'''
import re

alias = 'e'
"Filter name alias (if not defined, ZC will use module name)"

char_map = {
	'<': '&lt;',
	'>': '&gt;',
	'&': '&amp;'
}

re_chars = re.compile(r'[<>&]')

def escape_chars(text):
	return re_chars.sub(lambda m: char_map[m.group(0)], text)

def process(tree, profile=None):
	for item in tree.children:
		item.start = escape_chars(item.start)
		item.end = escape_chars(item.end)
		
		process(item)
	
	return tree