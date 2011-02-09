#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''
Filter that produces HAML tree
@author Sergey Chikuyonok (serge.che@gmail.com)
@link http://chikuyonok.ru
'''
import zencoding.utils

child_token = '${child}'
tabstops = [0]
	
def make_attributes_string(tag, profile):
	"""
	 Creates HTML attributes string from tag according to profile settings
	 @type tag: ZenNode
	 @type profile: dict
	"""
	# make attribute string
	attrs = ''
	attr_quote = profile['attr_quotes'] == 'single' and "'" or '"'
	cursor = profile['place_cursor'] and zencoding.utils.get_caret_placeholder() or ''
		
	# use short notation for ID and CLASS attributes
	for a in tag.attributes:
		name_lower = a['name'].lower()
		if name_lower == 'id':
			attrs += '#' + (a['value'] or cursor)
		elif name_lower == 'class':
			attrs += '.' + (a['value'] or cursor)
			
	other_attrs = []
	
	# process other attributes
	for a in tag.attributes:
		name_lower = a['name'].lower()
		if name_lower != 'id' and name_lower != 'class':
			attr_name = profile['attr_case'] == 'upper' and a['name'].upper() or name_lower
			other_attrs.append(':' + attr_name + ' => ' + attr_quote + (a['value'] or cursor) + attr_quote)
		
	if other_attrs:
		attrs += '{' + ', '.join(other_attrs) + '}'
	
	return attrs

def _replace(placeholder, value):
	if placeholder:
		return placeholder % value
	else:
		return value		

def process_snippet(item, profile, level=0):
	"""
	Processes element with <code>snippet</code> type
	@type item: ZenNode
	@type profile: dict
	@type level: int
	"""
	data = item.source.value
		
	if not data:
		# snippet wasn't found, process it as tag
		return process_tag(item, profile, level)
		
	tokens = data.split(child_token)
	if len(tokens) < 2:
		start = tokens[0]
		end = ''
	else:
		start, end = tokens
	
	padding = item.parent and item.parent.padding or ''
		
	item.start = _replace(item.start, zencoding.utils.pad_string(start, padding))
	item.end = _replace(item.end, zencoding.utils.pad_string(end, padding))
	
	# replace variables ID and CLASS
	def cb(m):
		if m.group(1) == 'id' or m.group(1) == 'class':
			return item.get_attribute(m.group(1))
		else:
			return m.group(0)
	
	item.start = zencoding.utils.replace_variables(item.start, cb)
	item.end = zencoding.utils.replace_variables(item.end, cb)
	
	return item

def has_block_sibling(item):
	"""
	Test if passed node has block-level sibling element
	@type item: ZenNode
	@return: bool
	"""
	return item.parent and item.parent.has_block_children()

def process_tag(item, profile, level=0):
	"""
	Processes element with <code>tag</code> type
	@type item: ZenNode
	@type profile: dict
	@type level: int
	"""
	if not item.name:
		# looks like it's root element
		return item
	
	attrs = make_attributes_string(item, profile) 
	cursor = profile['place_cursor'] and zencoding.utils.get_caret_placeholder() or ''
	self_closing = ''
	is_unary = item.is_unary() and not item.children
	
	if profile['self_closing_tag'] and is_unary:
		self_closing = '/'
		
	# define tag name
	tag_name = '%' + (profile['tag_case'] == 'upper' and item.name.upper() or item.name.lower())
					
	if tag_name.lower() == '%div' and '{' not in attrs:
		# omit div tag
		tag_name = ''
		
	item.end = ''
	item.start = _replace(item.start, tag_name + attrs + self_closing)
	
	if not item.children and not is_unary:
		item.start += cursor
	
	return item

@zencoding.filter('haml')
def process(tree, profile, level=0):
	"""
	Processes simplified tree, making it suitable for output as HTML structure
	@type tree: ZenNode
	@type profile: dict
	@type level: int
	"""
	if level == 0:
		# preformat tree
		tree = zencoding.run_filters(tree, profile, '_format')
		tabstops[0] = 0
		
	for item in tree.children:
		if item.type == 'tag':
			process_tag(item, profile, level)
		else:
			process_snippet(item, profile, level)
	
		# replace counters
		counter = zencoding.utils.get_counter_for_node(item)
		item.start = zencoding.utils.unescape_text(zencoding.utils.replace_counter(item.start, counter))
		item.end = zencoding.utils.unescape_text(zencoding.utils.replace_counter(item.end, counter))
		
		tabstops[0] += zencoding.utils.upgrade_tabstops(item, tabstops[0]) + 1
		
		process(item, profile, level + 1)
		
	return tree