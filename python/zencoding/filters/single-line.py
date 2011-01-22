#!/usr/bin/env python
# -*- coding: utf-8 -*-
'''
Output abbreviation on a single line (i.e. no line breaks)
@author Sergey Chikuyonok (serge.che@gmail.com)
@link http://chikuyonok.ru
'''
import re
import zencoding

re_nl = re.compile(r'[\n\r]')
re_pad = re.compile(r'^\s+')

@zencoding.filter('s')
def process(tree, profile):
	for item in tree.children:
		if item.type == 'tag':
			# remove padding from item 
			item.start = re_pad.sub('', item.start)
			item.end = re_pad.sub('', item.end)
		
		# remove newlines 
		item.start = re_nl.sub('', item.start)
		item.end = re_nl.sub('', item.end)
		item.content = re_nl.sub('', item.content)
		
		process(item, profile)
	
	return tree