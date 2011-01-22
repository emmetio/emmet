'''
Actions that use stream parsers and tokenizers for traversing:
-- Search for next/previous items in HTML
-- Search for next/previous items in CSS

Created on Jan 21, 2011

@author: sergey
'''
import re
import zencoding
import zencoding.parser.utils as parser_utils

start_tag = re.compile('^<([\w\:\-]+)((?:\s+[\w\-:]+(?:\s*=\s*(?:(?:"[^"]*")|(?:\'[^\']*\')|[^>\s]+))?)*)\s*(\/?)>')
known_xml_types = ['xml-tagname','xml-attname', 'xml-attribute']
known_css_types = ['selector', 'identifier', 'value']

def find_next_html_item(editor):
	"""
	Find next HTML item
	@param editor: ZenEditor
	"""
	is_first = [True]
	
	def fn(content, search_pos, is_backward=False):
		if is_first[0]:
			is_first[0] = False
			return find_opening_tag_from_position(content, search_pos)
		else:
			return get_opening_tag_from_position(content, search_pos)
	
	return find_item(editor, False, fn, get_range_for_next_item_in_html)

def find_prev_html_item(editor):
	"""
	Find previous HTML item
	@param editor: ZenEditor
	"""
	return find_item(editor, True, get_opening_tag_from_position, get_range_for_prev_item_in_html)

def get_range_for_next_item_in_html(tag, offset, sel_start, sel_end):
	"""
	Returns range for item to be selected in tag after current caret position
	@param tag: Tag declaration
	@type tag: str
	
	@param offset: Tag's position index inside content
	@type offset: int
	
	@param sel_start: Start index of user selection
	@type sel_start: int
	
	@param sel_end: End index of user selection
	@type sel_end: int
	
	@return List with two indexes if next item was found, None otherwise
	"""
	tokens = parser_utils.parse_html(tag, offset)
	next = []
			
	# search for token that is right to selection
	for i, token in enumerate(tokens):
		if token['type'] in known_xml_types:
			# check token position
			pos_test = token['start'] >= sel_start
			if token['type'] == 'xml-attribute' and is_quote(token['content'][0]):
				pos_test = token['start'] + 1 >= sel_start and token['end'] -1 != sel_end
			
			if not pos_test and not (sel_start == sel_end and token['end'] > sel_start):
				continue
			
			# found token that should be selected
			if token['type'] == 'xml-attname':
				next = handle_full_attribute_html(tokens, i, sel_end <= token['end'] and token['start'] or -1)
				if next:
					return next
			elif token['end'] > sel_end:
				next = [token['start'], token['end']]
				
				if token['type'] == 'xml-attribute':
					next = handle_quotes_html(token['content'], next)
					
				if sel_start == next[0] and sel_end == next[1]:
					# in case of empty attribute
					continue
				
				return next
		
	return None

def get_range_for_prev_item_in_html(tag, offset, sel_start, sel_end):
	"""
	Returns range for item to be selected in tag before current caret position
	@param tag: Tag declaration
	@type tag: str
	
	@param offset: Tag's position index inside content
	@type offset: int
	
	@param sel_start: Start index of user selection
	@type sel_start: int
	
	@param sel_end: End index of user selection
	@type sel_end: int
	
	@return List with two indexes if next item was found, None otherwise
	"""
	tokens = parser_utils.parse_html(tag, offset)
			
	# search for token that is left to the selection
	for i in range(len(tokens) - 1, -1, -1):
		token = tokens[i]
		if token['type'] in known_xml_types:
			# check token position
			pos_test = token['start'] < sel_start
			if token['type'] == 'xml-attribute' and is_quote(token['content'][0]):
				pos_test = token['start'] + 1 < sel_start
			
			if not pos_test: continue
			
			# found token that should be selected
			if token['type'] == 'xml-attname':
				next = handle_full_attribute_html(tokens, i, token['start'])
				if next: return next
			else:
				next = [token['start'], token['end']]
				
				if token['type'] == 'xml-attribute':
					next = handle_quotes_html(token['content'], next)
				
				return next
		
	return None

def find_opening_tag_from_position(html, pos):
	"""
	Search for opening tag in content, starting at specified position
	@param html: Where to search tag
	@type html: str
	
	@param pos: Character index where to start searching
	@type pos: int
	
	@return: List with tag indexes if valid opening tag was found, None otherwise
	"""
	while pos >= 0:
		tag = get_opening_tag_from_position(html, pos)
		if tag:
			return tag
		pos -= 1
	
	return None

def get_opening_tag_from_position(html, pos, is_backward=False):
	"""
	@param html: Where to search tag
	@type html: str
	
	@param pos: Character index where to start searching
	@type pos: int
	
	@return: List with tag indexes if valid opening tag was found, None otherwise
	"""
	if html[pos] == '<':
		m = re.search(start_tag, html[pos:])
		if m:
			return [pos, pos + len(m.group(0))]
		
	return None


def is_quote(ch):
	return ch == '"' or ch == "'"

def find_item(editor, is_backward, extract_fn, range_fn):
	"""
	@type editor: ZenEditor
	
	@param is_backward: Search backward (search forward otherwise)
	@type is_backward: boolean
	
	@param extract_fn: Function that extracts item content
	@type extract_fn: function
	
	@param range_rn: Function that search for next token range
	@type range_rn: function
	"""
	content = editor.get_content()
	c_len = len(content)
	loop = 100000 # endless loop protection
	prev_range = [-1, -1]
	_sel_start, _sel_end = editor.get_selection_range()
	sel_start = min(_sel_start, _sel_end)
	sel_end = max(_sel_start, _sel_end)
		
	search_pos = sel_start
	while search_pos >= 0 and search_pos < c_len and loop > 0:
		loop -= 1
		item = extract_fn(content, search_pos, is_backward)
		if item:
			if prev_range[0] == item[0] and prev_range[1] == item[1]:
				break
			
			prev_range[0] = item[0]
			prev_range[1] = item[1]
			item_def = content[item[0]:item[1]]
			rng = range_fn(item_def, item[0], sel_start, sel_end)
				
			if rng:
				editor.create_selection(rng[0], rng[1])
				return True
			else:
				search_pos = is_backward and item[0] or item[1] - 1
		
		search_pos += is_backward and -1 or 1
	
	return False

def find_next_css_item(editor):
	return find_item(editor, False, parser_utils.extract_css_rule, get_range_for_next_item_in_css)

def find_prev_css_item(editor):
	return find_item(editor, True, parser_utils.extract_css_rule, get_range_for_prev_item_in_css)


def get_range_for_next_item_in_css(rule, offset, sel_start, sel_end):
	"""
    Returns range for item to be selected in tag after current caret position
    
    @param rule: CSS rule declaration
    @type rule: str
    
    @param offset: Rule's position index inside content
    @type offset: int
    
    @param sel_start: Start index of user selection
    @type sel_start: int
    
    @param sel_end: End index of user selection
    @type sel_end: int
    
    @return: List with two indexes if next item was found, None otherwise
	"""
	tokens = parser_utils.parse_css(rule, offset)
	next = []
		
	def check_same_range(r):
		"Same range is used inside complex value processor"
		return r[0] == sel_start and r[1] == sel_end
	
			
	# search for token that is right to selection
	for i, token in enumerate(tokens):
		if token['type'] in known_css_types:
			# check token position
			if sel_start == sel_end:
				pos_test = token['end'] > sel_start
			else:
				pos_test = token['start'] >= sel_start
				if token['type'] == 'value': # respect complex values
					pos_test = pos_test or sel_start >= token['start'] and token['end'] >= sel_end
			
			if not pos_test: continue
			
			# found token that should be selected
			if token['type'] == 'identifier':
				rule_sel = handle_full_rule_css(tokens, i, sel_end <= token['end'] and token['start'] or -1)
				if rule_sel:
					return rule_sel
				
			elif token['type'] == 'value' and sel_end > token['start'] and token['children']:
				# looks like a complex value
				children = token['children']
				for child in children:
					if child[0] >= sel_start or (sel_start == sel_end and child[1] > sel_start):
						next = [child[0], child[1]]
						if check_same_range(next):
							rule_sel = handle_css_special_case(rule, next[0], next[1], offset)
							if not check_same_range(rule_sel):
								return rule_sel
							else:
								continue
						
						return next
			elif token['end'] > sel_end:
				return [token['start'], token['end']]
	
	return None

def get_range_for_prev_item_in_css(rule, offset, sel_start, sel_end):
	"""
	Returns range for item to be selected in CSS rule before current caret position
	
	@param rule: CSS rule declaration
    @type rule: str
    
    @param offset: Rule's position index inside content
    @type offset: int
    
    @param sel_start: Start index of user selection
    @type sel_start: int
    
    @param sel_end: End index of user selection
    @type sel_end: int
    
    @return: List with two indexes if next item was found, None otherwise
	"""
	tokens = parser_utils.parse_css(rule, offset)
	next = []
			
	def check_same_range(r):
		"Same range is used inside complex value processor"
		return r[0] == sel_start and r[1] == sel_end
		
	# search for token that is left to the selection
	for i in range(len(tokens) - 1, -1, -1):
		token = tokens[i]
		if token['type'] in known_css_types:
			# check token position
			pos_test = token['start'] < sel_start
			if token['type'] == 'value' and token['ref_start_ix'] != token['ref_end_ix']: # respect complex values
				pos_test = token['start'] <= sel_start
			
			if not pos_test: continue
			
			# found token that should be selected
			if token['type'] == 'identifier':
				rule_sel = handle_full_rule_css(tokens, i, token['start'])
				if rule_sel:
					return rule_sel
			elif token['type'] == 'value' and token['ref_start_ix'] != token['ref_end_ix']:
				# looks like a complex value
				children = token['children']
				for child in children:
					if child[0] < sel_start:
						# create array copy
						next = [child[0], child[1]] 
						
						rule_sel = handle_css_special_case(rule, next[0], next[1], offset)
						return not check_same_range(rule_sel) and rule_sel or next
					
				# if we are here than we already traversed trough all
				# child tokens, select full value
				next = [token['start'], token['end']]
				if not check_same_range(next): 
					return next
			else:
				return [token['start'], token['end']]
	
	return None

def handle_full_rule_css(tokens, i, start):
	for t in tokens[i+1:]:
		if (t['type'] == 'value' and start == -1) or t['type'] == 'identifier':
			return [t['start'], t['end']]
		elif t['type'] == ';':
			return [start == -1 and t['start'] or start, t['end']]
		elif t['type'] == '}':
			return [start == -1 and t['start'] or start, t['start'] - 1]
		
	return None

def handle_full_attribute_html(tokens, i, start):
	for t in tokens[i+1:]:
		if t['type'] == 'xml-attribute':
			if start == -1:
				return handle_quotes_html(t['content'], [t['start'], t['end']])
			else:
				return [start, t['end']]
		elif t['type'] == 'xml-attname':
			# moved to next attribute, adjust selection
			return [t['start'], tokens[i]['end']]
		
	return None

def handle_quotes_html(attr, r):
	if is_quote(attr[0]):
		r[0] += 1
	if is_quote(attr[-1]):
		r[1] -= 1
		
	return r

def handle_css_special_case(text, start, end, offset):
	text = text[start - offset:end - offset]
	m = re.match(r'^[\w\-]+\([\'"]?', text)
	if m:
		start += len(m.group(0))
		m = re.search(r'[\'"]?\)$', text)
		if m:
			end -= len(m.group(0))
	
	return [start, end]

@zencoding.action 
def select_next_item(editor):
	if editor.get_syntax() == 'css':
		return find_next_css_item(editor)
	else:
		return find_next_html_item(editor)

@zencoding.action	
def select_previous_item(editor):
	if editor.get_syntax() == 'css':
		return find_prev_css_item(editor)
	else:
		return find_prev_html_item(editor)
