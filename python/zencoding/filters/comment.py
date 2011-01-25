#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''
Comment important tags (with 'id' and 'class' attributes)
@author Sergey Chikuyonok (serge.che@gmail.com)
@link http://chikuyonok.ru
'''
import zencoding
import zencoding.utils as utils

def add_comments(node, i):
	
	"""
	Add comments to tag
	@type node: ZenNode
	@type i: int
	"""
	id_attr = node.get_attribute('id')
	class_attr = node.get_attribute('class')
	nl = utils.get_newline()
		
	if id_attr or class_attr:
		comment_str = ''
		padding = node.parent and node.parent.padding or ''
		if id_attr: comment_str += '#' + id_attr
		if class_attr: comment_str += '.' + class_attr
		
		node.start = node.start.replace('<', '<!-- ' + comment_str + ' -->' + nl + padding + '<', 1)
		node.end = node.end.replace('>', '>' + nl + padding + '<!-- /' + comment_str + ' -->', 1)
		
		# replace counters
		counter = zencoding.utils.get_counter_for_node(node)
		node.start = utils.replace_counter(node.start, counter)
		node.end = utils.replace_counter(node.end, counter)

@zencoding.filter('c')
def process(tree, profile):
	if profile['tag_nl'] is False:
		return tree
		
	for i, item in enumerate(tree.children):
		if item.is_block():
			add_comments(item, i)
		process(item, profile)
	
	return tree