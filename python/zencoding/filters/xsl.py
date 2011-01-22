#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''
Filter for trimming "select" attributes from some tags that contains
child elements
@author Sergey Chikuyonok (serge.che@gmail.com)
@link http://chikuyonok.ru
'''
import re
import zencoding

tags = {
	'xsl:variable': 1,
	'xsl:with-param': 1
}

re_attr = re.compile(r'\s+select\s*=\s*([\'"]).*?\1')

def trim_attribute(node):
	"""
	Removes "select" attribute from node
	@type node: ZenNode
	"""
	node.start = re_attr.sub('', node.start)

@zencoding.filter('xsl')
def process(tree, profile):
	for item in tree.children:
		if item.type == 'tag' and item.name.lower() in tags and item.children:
			trim_attribute(item)
		
		process(item, profile)