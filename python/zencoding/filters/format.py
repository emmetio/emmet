#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Generic formatting filter: creates proper indentation for each tree node,
placing "%s" placeholder where the actual output should be. You can use
this filter to preformat tree and then replace %s placeholder to whatever you
need. This filter should't be called directly from editor as a part 
of abbreviation.
@author Sergey Chikuyonok (serge.che@gmail.com)
@link http://chikuyonok.ru
"""
import re
import zencoding.utils

child_token = '${child}'
placeholder = '%s'

def get_newline():
	return zencoding.utils.get_newline()


def get_indentation():
	return zencoding.utils.get_indentation()

def has_block_sibling(item):
	"""
	Test if passed node has block-level sibling element
	@type item: ZenNode
	@return: bool
	"""
	return item.parent and item.parent.has_block_children()

def is_very_first_child(item):
	"""
	Test if passed itrem is very first child of the whole tree
	@type tree: ZenNode
	"""
	return item.parent and not item.parent.parent and not item.previous_sibling

def should_break_line(node, profile):
	"""
	Need to add line break before element
	@type node: ZenNode
	@type profile: dict
	@return: bool
	"""
	if not profile['inline_break']:
		return False
		
	# find toppest non-inline sibling
	while node.previous_sibling and node.previous_sibling.is_inline():
		node = node.previous_sibling
	
	if not node.is_inline():
		return False
		
	# calculate how many inline siblings we have
	node_count = 1
	node = node.next_sibling
	while node:
		if node.is_inline():
			node_count += 1
		else:
			break
		node = node.next_sibling
	
	return node_count >= profile['inline_break']

def should_break_child(node, profile):
	"""
	 Need to add newline because <code>item</code> has too many inline children
	 @type node: ZenNode
	 @type profile: dict
	 @return: bool
	"""
	# we need to test only one child element, because 
	# has_block_children() method will do the rest
	return node.children and should_break_line(node.children[0], profile)

def process_snippet(item, profile, level=0):
	"""
	Processes element with <code>snippet</code> type
	@type item: ZenNode
	@type profile: dict
	@param level: Depth level
	@type level: int
	"""
	data = item.source.value;
		
	if not data:
		# snippet wasn't found, process it as tag
		return process_tag(item, profile, level)
		
	item.start = placeholder
	item.end = placeholder
	
	padding = item.parent.padding if item.parent else get_indentation() * level 
	
	if not is_very_first_child(item):
		item.start = get_newline() + padding + item.start
	
	# adjust item formatting according to last line of <code>start</code> property
	parts = data.split(child_token)
	lines = zencoding.utils.split_by_lines(parts[0] or '')
	padding_delta = get_indentation()
		
	if len(lines) > 1:
		m = re.match(r'^(\s+)', lines[-1])
		if m:
			padding_delta = m.group(1)
	
	item.padding = padding + padding_delta
	
	return item

def process_tag(item, profile, level=0):
	"""
	Processes element with <code>tag</code> type
	@type item: ZenNode
	@type profile: dict
	@param level: Depth level
	@type level: int
	"""
	if not item.name:
		# looks like it's a root element
		return item
	
	item.start = placeholder
	item.end = placeholder
	
	is_unary = item.is_unary() and not item.children
		
	# formatting output
	if profile['tag_nl'] is not False:
		padding = item.parent.padding if item.parent else get_indentation() * level
		force_nl = profile['tag_nl'] is True
		should_break = should_break_line(item, profile)
		
		# formatting block-level elements
		if ((item.is_block() or should_break) and item.parent) or force_nl:
			# snippet children should take different formatting
			if not item.parent or (item.parent.type != 'snippet' and not is_very_first_child(item)):
				item.start = get_newline() + padding + item.start
				
			if item.has_block_children() or should_break_child(item, profile) or (force_nl and not is_unary):
				item.end = get_newline() + padding + item.end
				
			if item.has_tags_in_content() or (force_nl and not item.has_children() and not is_unary):
				item.start += get_newline() + padding + get_indentation()
			
		elif item.is_inline() and has_block_sibling(item) and not is_very_first_child(item):
			item.start = get_newline() + padding + item.start
		elif item.is_inline() and item.has_block_children():
			item.end = get_newline() + padding + item.end
		
		item.padding = padding + get_indentation()
	
	return item

@zencoding.filter('_format')
def process(tree, profile, level=0):
	"""
	Processes simplified tree, making it suitable for output as HTML structure
	@type item: ZenNode
	@type profile: dict
	@param level: Depth level
	@type level: int
	"""
	
	for item in tree.children:
		if item.type == 'tag':
			item = process_tag(item, profile, level)
		else:
			item = process_snippet(item, profile, level)
		
		if item.content:
			item.content = zencoding.utils.pad_string(item.content, item.padding)
			
		process(item, profile, level + 1)
	
	return tree