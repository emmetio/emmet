#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''
Comment important tags (with 'id' and 'class' attributes)
@author Sergey Chikuyonok (serge.che@gmail.com)
@link http://chikuyonok.ru
'''
from zencoding import zen_core as zen_coding

alias = 'c'
"Filter name alias (if not defined, ZC will use module name)"

def add_comments(node, i):
	
	"""
	Add comments to tag
	@type node: ZenNode
	@type i: int
	"""
	id_attr = node.get_attribute('id')
	class_attr = node.get_attribute('class')
	nl = zen_coding.get_newline()
		
	if id_attr or class_attr:
		comment_str = ''
		padding = node.parent and node.parent.padding or ''
		if id_attr: comment_str += '#' + id_attr
		if class_attr: comment_str += '.' + class_attr
		
		node.start = node.start.replace('<', '<!-- ' + comment_str + ' -->' + nl + padding + '<', 1)
		node.end = node.end.replace('>', '>' + nl + padding + '<!-- /' + comment_str + ' -->', 1)
		
		# replace counters
		node.start = zen_coding.replace_counter(node.start, i + 1)
		node.end = zen_coding.replace_counter(node.end, i + 1)

def process(tree, profile):
	if profile['tag_nl'] is False:
		return tree
		
	for i, item in enumerate(tree.children):
		if item.is_block():
			add_comments(item, i)
		process(item, profile)
	
	return tree