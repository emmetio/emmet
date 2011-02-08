#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''
Created on Jan 21, 2011

@author: sergey
'''
from zencoding.actions.basic import starts_with
from zencoding.utils import prettify_number
import base64
import math
import re
import zencoding
import zencoding.interface.file as zen_file
import zencoding.parser.utils as parser_utils

@zencoding.action
def reflect_css_value(editor):
	"""
	Reflect CSS value: takes rule's value under caret and pastes it for the same 
	rules with vendor prefixes
	@param editor: ZenEditor
	"""
	if editor.get_syntax() != 'css':
		return False
	
	return compound_update(editor, do_css_reflection(editor))

@zencoding.action
def update_image_size(editor):
	"""
	Update image size: reads image from image/CSS rule under caret
	and updates dimensions inside tag/rule
	@type editor: ZenEditor
	"""
	if editor.get_syntax() == 'css':
		result = update_image_size_css(editor)
	else:
		result = update_image_size_html(editor)
	
	return compound_update(editor, result)

def compound_update(editor, data):
	if data:
		text = data['data']
		
		sel_start, sel_end = editor.get_selection_range()
		
		# try to preserve caret position
		if data['caret'] < data['start'] + len(text):
			relative_pos = data['caret'] - data['start']
			if relative_pos >= 0:
				text = text[:relative_pos] + zencoding.utils.get_caret_placeholder() + text[relative_pos:]
		
		editor.replace_content(text, data['start'], data['end'], True)
#		editor.replace_content(zencoding.utils.unindent(editor, text), data['start'], data['end'])
		editor.create_selection(data['caret'], data['caret'] + sel_end - sel_start)
		return True
	
	return False

def update_image_size_html(editor):
	"""
	Updates image size of &lt;img src=""&gt; tag
	@type editor: ZenEditor
	"""
	editor_file = editor.get_file_path()
	caret_pos = editor.get_caret_pos()
		
	if editor_file is None:
		raise zencoding.utils.ZenError("You should save your file before using this action")
		
	image = _find_image(editor)
	
	if image:
		# search for image path
		m = re.search(r'src=(["\'])(.+?)\1', image['tag'], re.IGNORECASE)
		if m:
			src = m.group(2)
			
		if src:
			size = get_image_size_for_source(editor, src)
			if size:
				new_tag = _replace_or_append(image['tag'], 'width', size['width'])
				new_tag = _replace_or_append(new_tag, 'height', size['height'])
				
				return {
					'data': new_tag,
					'start': image['start'],
					'end': image['end'],
					'caret': caret_pos
				}
	return False

def get_image_size_for_source(editor, src):
	"""
	Returns image dimentions for source
	@param {zen_editor} editor
	@param {String} src Image source (path or data:url)
	"""
	if src:
		# check if it is data:url
		if starts_with('data:', src):
			f_content = base64.b64decode( re.sub(r'^data\:.+?;.+?,', '', src) )
		else:
			editor_file = editor.get_file_path()
			
			if editor_file is None:
				raise zencoding.utils.ZenError("You should save your file before using this action")
			
			abs_src = zen_file.locate_file(editor_file, src)
			if not abs_src:
				raise zencoding.utils.ZenError("Can't locate '%s' file" % src)
			
			f_content = zen_file.read(abs_src)
		
		return zencoding.utils.get_image_size(f_content)

def _replace_or_append(img_tag, attr_name, attr_value):
	"""
	Replaces or adds attribute to the tag
	@type img_tag: str
	@type attr_name: str
	@type attr_value: str
	"""
	if attr_name in img_tag.lower():
		# attribute exists
		re_attr = re.compile(attr_name + r'=([\'"])(.*?)\1', re.I)
		return re.sub(re_attr, lambda m: '%s=%s%s%s' % (attr_name, m.group(1), attr_value, m.group(1)), img_tag)
	else:
		return re.sub(r'\s*(\/?>)$', ' %s="%s" \\1' % (attr_name, attr_value), img_tag)

def _find_image(editor):
	"""
	Find image tag under caret
 	@return Image tag and its indexes inside editor source
	"""
	_caret = editor.get_caret_pos()
	text = editor.get_content()
	start_ix = -1
	end_ix = -1
	
	# find the beginning of the tag
	caret_pos = _caret
	while caret_pos >= 0:
		if text[caret_pos] == '<':
			if text[caret_pos:caret_pos + 4].lower() == '<img':
				# found the beginning of the image tag
				start_ix = caret_pos
				break
			else:
				# found some other tag
				return None
		caret_pos -= 1
			
	# find the end of the tag 
	caret_pos = _caret
	ln = len(text)
	while caret_pos <= ln:
		if text[caret_pos] == '>':
			end_ix = caret_pos + 1
			break
		caret_pos += 1
	
	
	if start_ix != -1 and end_ix != -1:
		return {
			'start': start_ix,
			'end': end_ix,
			'tag': text[start_ix:end_ix]
		}
	
	return None

def find_css_insertion_point(tokens, start_ix):
	"""
	Search for insertion point for new CSS properties
	@param tokens: List of parsed CSS tokens
	@param start_ix: Token index where to start searching
	"""
	ins_point = None
	ins_ix = -1 
	need_col = False
	
	for i in range(start_ix, len(tokens)):
		t = tokens[i]
		if t['type'] == 'value':
			ins_point = t
			ins_ix = i
			
			# look ahead for rule termination
			if i + 1 < len(tokens) and tokens[i + 1]['type'] == ';':
				ins_point = tokens[i + 1]
				ins_ix += 1
			else:
				need_col = True
				
			break
	
	return {
		'token': ins_point,
		'ix': ins_ix,
		'need_col': need_col
	}

def update_image_size_css(editor):
	"""
	Updates image size of CSS rule
 	@type editor: ZenEditor
	"""
	caret_pos = editor.get_caret_pos()
	content = editor.get_content()
	rule = parser_utils.extract_css_rule(content, caret_pos, True)
	
	if rule:
		css = parser_utils.parse_css(content[rule[0]:rule[1]], rule[0])
		cur_token = find_token_from_position(css, caret_pos, 'identifier')
		value = find_value_token(css, cur_token + 1)
			
		if not value: return False
		
		# find insertion point
		ins_point = find_css_insertion_point(css, cur_token)
		
		m = re.match(r'url\((["\']?)(.+?)\1\)', value['content'], re.I)
		if m:
			size = get_image_size_for_source(editor, m.group(2))
			if size:
				wh = {'width': None, 'height': None}
				updates = []
				styler = learn_css_style(css, cur_token)
				
				for i, item in enumerate(css):
					if item['type'] == 'identifier' and item['content'] in wh:
						wh[item['content']] = i
					
				def update(name, val):
					v = None
					if wh[name] is not None:
						v = find_value_token(css, wh[name] + 1)
						
					if v:
						updates.append([v['start'], v['end'], '%spx' % val])
					else:
						updates.append([ins_point['token']['end'], ins_point['token']['end'], styler(name, '%spx' % val)])
						
				
				update('width', size['width'])
				update('height', size['height'])
				
				if updates:
					updates.sort(lambda a,b: a[0] - b[0])
#					updates = sorted(updates, key=lambda a: a[0]) 
					
					# some editors do not provide easy way to replace multiple code 
					# fragments so we have to squash all replace operations into one
					offset = updates[0][0]
					offset_end = updates[-1][1]
					data = content[offset:offset_end]
					
					updates.reverse()
					for u in updates:
						data = replace_substring(data, u[0] - offset, u[1] - offset, u[2])
							
						# also calculate new caret position
						if u[0] < caret_pos:
							caret_pos += len(u[2]) - u[1] + u[0]
						
					
					if ins_point['need_col']:
						data = replace_substring(data, ins_point['token']['end'] - offset, ins_point['token']['end'] - offset, ';')
					
					return {
						'data': data,
						'start': offset,
						'end': offset_end,
						'caret': caret_pos
					};
					
	return None

def learn_css_style(tokens, pos):
	"""
	Learns formatting style from parsed tokens
	@param tokens: List of tokens
	@param pos: Identifier token position, from which style should be learned
	@returns: Function with <code>(name, value)</code> arguments that will create
	CSS rule based on learned formatting
	"""
	prefix = ''
	glue = ''
	
	# use original tokens instead of optimized ones
	pos = tokens[pos]['ref_start_ix']
	tokens = tokens.original
	
	# learn prefix
	for i in xrange(pos - 1, -1, -1):
		if tokens[i]['type'] == 'white':
			prefix = tokens[i]['content'] + prefix
		elif tokens[i]['type'] == 'line':
			prefix = tokens[i]['content'] + prefix
			break
		else:  
			break
	
	# learn glue
	for t in tokens[pos+1:]:
		if t['type'] == 'white' or t['type'] == ':':
			glue += t['content']
		else:
			break
	
	if ':' not in glue:
		glue = ':'
		
	return lambda name, value: "%s%s%s%s;" % (prefix, name, glue, value)
	

def do_css_reflection(editor):
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
				
			values.reverse()
			for v in values:
				rv = get_reflected_value(cur_prop, value, v['name']['content'], v['value']['content'])
				data = replace_substring(data, v['value']['start'] - offset, v['value']['end'] - offset, rv)
					
				# also calculate new caret position
				if v['value']['start'] < caret_pos:
					caret_pos += len(rv) - len(v['value']['content'])
				
			return {
				'data': data,
				'start': offset,
				'end': values[0]['value']['end'],
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
