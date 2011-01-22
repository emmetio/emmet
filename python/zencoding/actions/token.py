#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''
Created on Jan 21, 2011

@author: sergey
'''
import zencoding.parser.utils as parser_utils
import re
import math
from zencoding.utils import prettify_number
import zencoding

@zencoding.action
def reflect_css_value(editor):
	"""
	Reflect CSS value: takes rule's value under caret and pastes it for the same 
	rules with vendor prefixes
	@param editor: ZenEditor
	"""
	if editor.get_syntax() != 'css':
		return False
	
	result = do_css_refelction(editor)
	if result:
		sel_start, sel_end = editor.get_selection_range()
		editor.replace_content(result['data'], result['start'], result['end'], True)
		editor.create_selection(result['caret'], result['caret'] + sel_end - sel_start)
		return True
	
	return False

def do_css_refelction(editor):
	content = editor.get_content()
	caret_pos = editor.get_caret_pos()
	css = parser_utils.extract_css_rule(content, caret_pos)
		
	if not css or caret_pos < css[0] or caret_pos > css[1]:
		# no matching CSS rule or caret outside rule bounds
		return False
		
	tokens = parser_utils.parse_css(content[css[0]:css[1]], css[0])
	token_ix = find_token_from_position(tokens, caret_pos, 'identifier')
	
	if token_ix != -1:
		cur_prop = tokens[token_ix]['content']
		value_token = find_value_token(tokens, token_ix + 1)
		base_name = get_base_css_name(cur_prop)
		re_name = re.compile('^(?:\\-\\w+\\-)?' + base_name + '$')
		re_name = get_reflected_css_name(base_name)
		values = []
			
		if not value_token:
			return False
			
		# search for all vendor-prefixed properties
		for i, token in enumerate(tokens):
			if token['type'] == 'identifier' and re.search(re_name, token['content']) and token['content'] != cur_prop:
				v = find_value_token(tokens, i + 1)
				if v:
					values.append({'name': token, 'value': v})
		
		# some editors do not provide easy way to replace multiple code 
		# fragments so we have to squash all replace operations into one
		if values:
			data = content[values[0]['value']['start']:values[-1]['value']['end']]
			offset = values[0]['value']['start']
			value = value_token['content']
				
			for v in values:
				data = replace_substring(data, v['value']['start'] - offset, v['value']['end'] - offset, 
					get_reflected_value(cur_prop, value, v['name']['content'], v['value']['content']))
					
				# also calculate new caret position
				if v['value']['start'] < caret_pos:
					caret_pos += len(value) - v['value']['end'] + v['value']['start']
				
			return {
				'data': data,
				'start': offset,
				'end': values[-1]['value']['end'],
				'caret': caret_pos
			}
	
	return None

def get_base_css_name(name):
	"""
    Removes vendor prefix from CSS property
    @param name: CSS property
    @type name: str
    @return: str
	"""
	return re.sub(r'^\s*\-\w+\-', '', name)

def get_reflected_css_name(name):
	"""
    Returns regexp that should match reflected CSS property names
    @param name: Current CSS property name
    @type name: str
    @return: RegExp
	"""
	name = get_base_css_name(name)
	vendor_prefix = '^(?:\\-\\w+\\-)?'
	
	if name == 'opacity' or name == 'filter':
		return re.compile(vendor_prefix + '(?:opacity|filter)$')
	
	m = re.match(r'^border-radius-(top|bottom)(left|right)', name)
	if m:
		# Mozilla-style border radius
		return re.compile(vendor_prefix + '(?:%s|border-%s-%s-radius)$' % (name, m.group(1), m.group(2)) )
	
	m = re.match(r'^border-(top|bottom)-(left|right)-radius', name)
	if m: 
		return re.compile(vendor_prefix + '(?:%s|border-radius-%s%s)$'  % (name, m.group(1), m.group(2)) );
	
	return re.compile(vendor_prefix + name + '$')

def get_reflected_value(cur_name, cur_value, ref_name, ref_value):
	"""
    Returns value that should be reflected for <code>ref_name</code> CSS property
    from <code>cur_name</code> property. This function is used for special cases,
    when the same result must be achieved with different properties for different
    browsers. For example: opаcity:0.5; -> filter:alpha(opacity=50);<br><br>
     
    This function does value conversion between different CSS properties
     
    @param cur_name: Current CSS property name
    @type cur_name: str
    @param cur_value: Current CSS property value
    @type cur_value: str
    @param ref_name: Receiver CSS property's name 
    @type ref_name: str 
    @param ref_value: Receiver CSS property's value
    @type ref_value: str
    @return: New value for receiver property
	"""
	cur_name = get_base_css_name(cur_name)
	ref_name = get_base_css_name(ref_name)
	
	if cur_name == 'opacity' and ref_name == 'filter':
		return re.sub(re.compile(r'opacity=[^\)]*', re.IGNORECASE), 'opacity=' + math.floor(float(cur_value) * 100), ref_value)
	if cur_name == 'filter' and ref_name == 'opacity':
		m = re.search(r'opacity=([^\)]*)', cur_value, re.IGNORECASE)
		return prettify_number(int(m.group(1)) / 100) if m else ref_value
	
	
	return cur_value

def find_value_token(tokens, pos):
	"""
    Find value token, staring at <code>pos</code> index and moving right
    @type tokens: list
    @type pos: int
    @return: token
	"""
	for t in tokens[pos:]:
		if t['type'] == 'value':
			return t
		elif t['type'] == 'identifier' or t['type'] == ';':
			break
		
	return None

def replace_substring(text, start, end, new_value):
	"""
    Replace substring of <code>text</code>, defined by <code>start</code> and 
    <code>end</code> indexes with <code>new_value</code>
    @type text: str
    @type start: int
    @type end: int
    @type new_value: str
    @return: str
	"""
	return text[0:start] + new_value + text[end:]

def find_token_from_position(tokens, pos, type):
	"""
    Search for token with specified type left to the specified position
    @param tokens: List of parsed tokens
    @type tokens: list
    @param pos: Position where to start searching
    @type pos: int
    @param type: Token type
    @type type: str
    @return: Token index
	"""
	# find token under caret
	token_ix = -1;
	for i, token in enumerate(tokens):
		if token['start'] <= pos and token['end'] >= pos:
			token_ix = i
			break
		
	if token_ix != -1:
		# token found, search left until we find token with specified type
		while token_ix >= 0:
			if tokens[token_ix]['type'] == type:
				return token_ix
			token_ix -= 1
	
	return -1
