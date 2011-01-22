#!/usr/bin/env python
# -*- coding: utf-8 -*-
'''
Process CSS properties: replaces snippets, augumented with ! char, with 
<em>!important</em> suffix
@author Sergey Chikuyonok (serge.che@gmail.com)
@link http://chikuyonok.ru
'''
import re
import zencoding

re_important = re.compile(r'(.+)\!$')

@zencoding.filter('css')
def process(tree, profile):
	for item in tree.children:
		# CSS properties are always snippets
		if item.type == 'snippet' and re_important.search(item.real_name):
			item.start = re.sub(r'(;?)$', ' !important\\1', item.start)
		
		process(item, profile)
	
	return tree