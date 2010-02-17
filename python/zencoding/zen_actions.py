#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Middleware layer that communicates between editor and Zen Coding.
This layer describes all available Zen Coding actions, like 
"Expand Abbreviation".
@author Sergey Chikuyonok (serge.che@gmail.com)
@link http://chikuyonok.ru
"""
from zencoding import zen_core as zen_coding
from zencoding import html_matcher
import re

def find_abbreviation(editor):
	"""
	Search for abbreviation in editor from current caret position
	@param editor: Editor instance
	@type editor: ZenEditor
	@return: str
	"""
	start, end = editor.get_selection_range()
	if start != end:
		# abbreviation is selected by user
		return editor.get_content()[start, end];
	
	# search for new abbreviation from current caret position
	cur_line_start, cur_line_end = editor.get_current_line_range()
	return zen_coding.extract_abbreviation(editor.get_content()[cur_line_start:start])

def expand_abbreviation(editor, syntax=None, profile_name=None):
	"""
	Find from current caret position and expand abbreviation in editor
	@param editor: Editor instance
	@type editor: ZenEditor
	@param syntax: Syntax type (html, css, etc.)
	@type syntax: str
	@param profile_name: Output profile name (html, xml, xhtml)
	@type profile_name: str
	@return: True if abbreviation was expanded successfully
	"""
	if syntax is None: syntax = editor.get_syntax()
	if profile_name is None: profile_name = editor.get_profile_name()
	
	range_start, caret_pos = editor.get_selection_range()
	abbr = find_abbreviation(editor)
	content = ''
		
	if abbr:
		content = zen_coding.expand_abbreviation(abbr, syntax, profile_name)
		if content:
			editor.replace_content(content, caret_pos - len(abbr), caret_pos)
			return True
	
	return False

def expand_abbreviation_with_tab(editor, syntax, profile_name='xhtml'):
	"""
	A special version of <code>expandAbbreviation</code> function: if it can't
	find abbreviation, it will place Tab character at caret position
	@param editor: Editor instance
	@type editor: ZenEditor
	@param syntax: Syntax type (html, css, etc.)
	@type syntax: str
	@param profile_name: Output profile name (html, xml, xhtml)
	@type profile_name: str
	"""
	if not expand_abbreviation(editor, syntax, profile_name):
		editor.replace_content(zen_coding.get_variable('indentation'), editor.get_caret_pos())
	
	return True 

def match_pair(editor, direction='out', syntax=None):
	"""
	Find and select HTML tag pair
	@param editor: Editor instance
	@type editor: ZenEditor
	@param direction: Direction of pair matching: 'in' or 'out'. 
	@type direction: str 
	"""
	direction = direction.lower()
	if syntax is None: syntax = editor.get_profile_name()
	
	range_start, range_end = editor.get_selection_range()
	cursor = range_end
	content = editor.get_content()
	rng = None
	
	old_open_tag = html_matcher.last_match['opening_tag']
	old_close_tag = html_matcher.last_match['closing_tag']
	
	if direction == 'in' and old_open_tag and range_start != range_end:
#		user has previously selected tag and wants to move inward
		if not old_close_tag:
#			unary tag was selected, can't move inward
			return False
		elif old_open_tag.start == range_start:
			if content[old_open_tag.end] == '<':
#				test if the first inward tag matches the entire parent tag's content
				_r = html_matcher.find(content, old_open_tag.end + 1, syntax)
				if _r[0] == old_open_tag.end and _r[1] == old_close_tag.start:
					rng = html_matcher.match(content, old_open_tag.end + 1, syntax)
				else:
					rng = (old_open_tag.end, old_close_tag.start)
			else:
				rng = (old_open_tag.end, old_close_tag.start)
		else:
			new_cursor = content[0:old_close_tag.start].find('<', old_open_tag.end)
			search_pos = new_cursor + 1 if new_cursor != -1 else old_open_tag.end
			rng = html_matcher.match(content, search_pos, syntax)
	else:
		rng = html_matcher.match(content, cursor, syntax)
	
	if rng and rng[0] is not None:
		editor.create_selection(rng[0], rng[1])
		return True
	else:
		return False

def match_pair_inward(editor):
	return match_pair(editor, 'in')
	
def match_pair_outward(editor):
	return match_pair(editor, 'out')

def narrow_to_non_space(text, start, end):
	"""
	Narrow down text indexes, adjusting selection to non-space characters
	@type text: str
	@type start: int
	@type end: int
	@return: list
	"""
	# narrow down selection until first non-space character
	while start < end:
		if not text[start].isspace():
			break
			
		start += 1
	
	while end > start:
		end -= 1
		if not text[end].isspace():
			end += 1
			break
		
	return start, end

def wrap_with_abbreviation(editor, abbr, syntax=None, profile_name=None):
	"""
	Wraps content with abbreviation
	@param editor: Editor instance
	@type editor: ZenEditor
	@param syntax: Syntax type (html, css, etc.)
	@type syntax: str
	@param profile_name: Output profile name (html, xml, xhtml)
	@type profile_name: str
	"""
	if not abbr: return None 
	
	if syntax is None: syntax = editor.get_syntax()
	if profile_name is None: profile_name = editor.get_profile_name()
	
	start_offset, end_offset = editor.get_selection_range()
	content = editor.get_content()
	
	if start_offset == end_offset:
		# no selection, find tag pair
		rng = html_matcher.match(content, start_offset, profile_name)
		
		if rng[0] is None: # nothing to wrap
			return None
		else:
			start_offset, end_offset = rng
			
	start_offset, end_offset = narrow_to_non_space(content, start_offset, end_offset)
	line_bounds = get_line_bounds(content, start_offset)
	padding = get_line_padding(content[line_bounds[0]:line_bounds[1]])
	
	new_content = content[start_offset:end_offset]
	result = zen_coding.wrap_with_abbreviation(abbr, unindent_text(new_content, padding), syntax, profile_name)
	
	if result:
		editor.replace_content(result, start_offset, end_offset)
		return True
	
	return False

def unindent(editor, text):
	"""
	Unindent content, thus preparing text for tag wrapping
	@param editor: Editor instance
	@type editor: ZenEditor
	@param text: str
	@return str
	"""
	return unindent_text(text, get_current_line_padding(editor))

def unindent_text(text, pad):
	"""
	Removes padding at the beginning of each text's line
	@type text: str
	@type pad: str
	"""
	lines = zen_coding.split_by_lines(text)
	
	for i,line in enumerate(lines):
		if line.startswith(pad):
			lines[i] = line[len(pad):]
	
	return zen_coding.get_newline().join(lines)

def get_current_line_padding(editor):
	"""
	Returns padding of current editor's line
	@return str
	"""
	return get_line_padding(editor.get_current_line())

def get_line_padding(line):
	"""
	Returns padding of current editor's line
	@return str
	"""
	m = re.match(r'^(\s+)', line)
	return m and m.group(0) or ''

def find_new_edit_point(editor, inc=1, offset=0):
	"""
	Search for new caret insertion point
	@param editor: Editor instance
	@type editor: ZenEditor
	@param inc: Search increment: -1 — search left, 1 — search right
	@param offset: Initial offset relative to current caret position
	@return: -1 if insertion point wasn't found
	"""
	cur_point = editor.get_caret_pos() + offset
	content = editor.get_content()
	max_len = len(content)
	next_point = -1
	re_empty_line = r'^\s+$'
	
	def get_line(ix):
		start = ix
		while start >= 0:
			c = content[start]
			if c == '\n' or c == '\r': break
			start -= 1
		
		return content[start:ix]
		
	while cur_point < max_len and cur_point > 0:
		cur_point += inc
		cur_char = content[cur_point]
		next_char = content[cur_point + 1]
		prev_char = content[cur_point - 1]
		
		if cur_char in '"\'':
			if next_char == cur_char and prev_char == '=':
				# empty attribute
				next_point = cur_point + 1
		elif cur_char == '>' and next_char == '<':
			# between tags
			next_point = cur_point + 1
		elif cur_char in '\r\n':
			# empty line
			if re.search(re_empty_line, get_line(cur_point - 1)):
				next_point = cur_point
		
		if next_point != -1: break
	
	return next_point

def prev_edit_point(editor):
	"""
	Move caret to previous edit point
	@param editor: Editor instance
	@type editor: ZenEditor
	"""
	cur_pos = editor.get_caret_pos()
	new_point = find_new_edit_point(editor, -1)
		
	if new_point == cur_pos:
		# we're still in the same point, try searching from the other place
		new_point = find_new_edit_point(editor, -1, -2)
	
	if new_point != -1:
		editor.set_caret_pos(new_point)
		return True
	
	return False

def next_edit_point(editor):
	"""
	Move caret to next edit point
	@param editor: Editor instance
	@type editor: ZenEditor
	""" 
	new_point = find_new_edit_point(editor, 1)
	if new_point != -1:
		editor.set_caret_pos(new_point)
		return True
	
	return False

def insert_formatted_newline(editor, mode='html'):
	"""
	Inserts newline character with proper indentation
	@param editor: Editor instance
	@type editor: ZenEditor
	@param mode: Syntax mode (only 'html' is implemented)
	@type mode: str
	"""
	caret_pos = editor.get_caret_pos()
	nl = zen_coding.get_newline()
	pad = zen_coding.get_variable('indentation')
		
	if mode == 'html':
		# let's see if we're breaking newly created tag
		pair = html_matcher.get_tags(editor.get_content(), editor.get_caret_pos(), editor.get_profile_name())
		
		if pair[0] and pair[1] and pair[0]['type'] == 'tag' and pair[0]['end'] == caret_pos and pair[1]['start'] == caret_pos:
			editor.replace_content(nl + pad + zen_coding.get_caret_placeholder() + nl, caret_pos)
		else:
			editor.replace_content(nl, caret_pos)
	else:
		editor.replace_content(nl, caret_pos)
		
	return True

def select_line(editor):
	"""
	Select line under cursor
	@param editor: Editor instance
	@type editor: ZenEditor
	"""
	start, end = editor.get_current_line_range();
	editor.create_selection(start, end)
	return True

def go_to_matching_pair(editor):
	"""
	Moves caret to matching opening or closing tag
	@param editor: Editor instance
	@type editor: ZenEditor
	"""
	content = editor.get_content()
	caret_pos = editor.get_caret_pos()
	
	if content[caret_pos] == '<': 
		# looks like caret is outside of tag pair  
		caret_pos += 1
		
	tags = html_matcher.get_tags(content, caret_pos, editor.get_profile_name())
		
	if tags and tags[0]:
		# match found
		open_tag, close_tag = tags
			
		if close_tag: # exclude unary tags
			if open_tag['start'] <= caret_pos and open_tag['end'] >= caret_pos:
				editor.set_caret_pos(close_tag['start'])
			elif close_tag['start'] <= caret_pos and close_tag['end'] >= caret_pos:
				editor.set_caret_pos(open_tag['start'])
				
		return True
	
	return False
				

def merge_lines(editor):
	"""
	Merge lines spanned by user selection. If there's no selection, tries to find
	matching tags and use them as selection
	@param editor: Editor instance
	@type editor: ZenEditor
	"""
	start, end = editor.get_selection_range()
	if start == end:
		# find matching tag
		pair = html_matcher.match(editor.get_content(), editor.get_caret_pos(), editor.get_profile_name())
		if pair and pair[0] is not None:
			start, end = pair
	
	if start != end:
		# got range, merge lines
		text = editor.get_content()[start:end]
		lines = map(lambda s: re.sub(r'^\s+', '', s), zen_coding.split_by_lines(text))
		text = re.sub(r'\s{2,}', ' ', ''.join(lines))
		editor.replace_content(text, start, end)
		editor.create_selection(start, start + len(text))
		return True
	
	return False

def toggle_comment(editor):
	"""
	Toggle comment on current editor's selection or HTML tag/CSS rule
	@type editor: ZenEditor
	"""
	syntax = editor.get_syntax()
	if syntax == 'css':
		return toggle_css_comment(editor)
	else:
		return toggle_html_comment(editor)

def toggle_html_comment(editor):
	"""
	Toggle HTML comment on current selection or tag
	@type editor: ZenEditor
	@return: True if comment was toggled
	"""
	start, end = editor.get_selection_range()
	content = editor.get_content()
		
	if start == end:
		# no selection, find matching tag
		pair = html_matcher.get_tags(content, editor.get_caret_pos(), editor.get_profile_name())
		if pair and pair[0]: # found pair
			start = pair[0].start
			end = pair[1] and pair[1].end or pair[0].end
	
	return generic_comment_toggle(editor, '<!--', '-->', start, end)

def toggle_css_comment(editor):
	"""
	Simple CSS commenting
	@type editor: ZenEditor
	@return: True if comment was toggled
	"""
	start, end = editor.get_selection_range()
	
	if start == end:
		# no selection, get current line
		start, end = editor.get_current_line_range()

		# adjust start index till first non-space character
		start, end = narrow_to_non_space(editor.get_content(), start, end)
	
	return generic_comment_toggle(editor, '/*', '*/', start, end)

def search_comment(text, pos, start_token, end_token):
	"""
	Search for nearest comment in <code>str</code>, starting from index <code>from</code>
	@param text: Where to search
	@type text: str
	@param pos: Search start index
	@type pos: int
	@param start_token: Comment start string
	@type start_token: str
	@param end_token: Comment end string
	@type end_token: str
	@return: None if comment wasn't found, list otherwise
	"""
	start_ch = start_token[0]
	end_ch = end_token[0]
	comment_start = -1
	comment_end = -1
	
	def has_match(tx, start):
		return text[start:start + len(tx)] == tx
	
		
	# search for comment start
	while pos:
		pos -= 1
		if text[pos] == start_ch and has_match(start_token, pos):
			comment_start = pos
			break
	
	if comment_start != -1:
		# search for comment end
		pos = comment_start
		content_len = len(text)
		while content_len >= pos:
			pos += 1
			if text[pos] == end_ch and has_match(end_token, pos):
				comment_end = pos + len(end_token)
				break
	
	if comment_start != -1 and comment_end != -1:
		return comment_start, comment_end
	else:
		return None

def generic_comment_toggle(editor, comment_start, comment_end, range_start, range_end):
	"""
	Generic comment toggling routine
	@type editor: ZenEditor
	@param comment_start: Comment start token
	@type comment_start: str
	@param comment_end: Comment end token
	@type comment_end: str
	@param range_start: Start selection range
	@type range_start: int
	@param range_end: End selection range
	@type range_end: int
	@return: bool
	"""
	content = editor.get_content()
	caret_pos = [editor.get_caret_pos()]
	new_content = None
		
	def adjust_caret_pos(m):
		caret_pos[0] -= len(m.group(0))
		return ''
		
	def remove_comment(text):
		"""
		Remove comment markers from string
		@param {Sting} str
		@return {String}
		"""
		text = re.sub(r'^' + re.escape(comment_start) + r'\s*', adjust_caret_pos, text)
		return re.sub(r'\s*' + re.escape(comment_end) + '$', '', text)
	
	def has_match(tx, start):
		return content[start:start + len(tx)] == tx
	
	# first, we need to make sure that this substring is not inside comment
	comment_range = search_comment(content, caret_pos[0], comment_start, comment_end)
	
	if comment_range and comment_range[0] <= range_start and comment_range[1] >= range_end:
		# we're inside comment, remove it
		range_start, range_end = comment_range
		new_content = remove_comment(content[range_start:range_end])
	else:
		# should add comment
		# make sure that there's no comment inside selection
		new_content = '%s %s %s' % (comment_start, re.sub(re.escape(comment_start) + r'\s*|\s*' + re.escape(comment_end), '', content[range_start:range_end]), comment_end)
			
		# adjust caret position
		caret_pos[0] += len(comment_start) + 1

	# replace editor content
	if new_content is not None:
		d = caret_pos[0] - range_start
		new_content = new_content[0:d] + zen_coding.get_caret_placeholder() + new_content[d:]
		editor.replace_content(unindent(editor, new_content), range_start, range_end)
		return True
	
	return False

def split_join_tag(editor, profile_name=None):
	"""
	Splits or joins tag, e.g. transforms it into a short notation and vice versa:
	<div></div> → <div /> : join
	<div /> → <div></div> : split
	@param editor: Editor instance
	@type editor: ZenEditor
	@param profile_name: Profile name
	@type profile_name: str
	"""
	caret_pos = editor.get_caret_pos()
	profile = zen_coding.get_profile(profile_name or editor.get_profile_name())
	caret = zen_coding.get_caret_placeholder()

	# find tag at current position
	pair = html_matcher.get_tags(editor.get_content(), caret_pos, profile_name or editor.get_profile_name())
	if pair and pair[0]:
		new_content = pair[0].full_tag
		
		if pair[1]: # join tag
			closing_slash = ''
			if profile['self_closing_tag'] is True:
				closing_slash = '/'
			elif profile['self_closing_tag'] == 'xhtml':
				closing_slash = ' /'
				
			new_content = re.sub(r'\s*>$', closing_slash + '>', new_content)
			
			# add caret placeholder
			if len(new_content) + pair[0].start < caret_pos:
				new_content += caret
			else:
				d = caret_pos - pair[0].start
				new_content = new_content[0:d] + caret + new_content[d:]
			
			editor.replace_content(new_content, pair[0].start, pair[1].end)
		else: # split tag
			nl = zen_coding.get_newline()
			pad = zen_coding.get_variable('indentation')
			
			# define tag content depending on profile
			tag_content = profile['tag_nl'] is True and nl + pad + caret + nl or caret
			
			new_content = '%s%s</%s>' % (re.sub(r'\s*\/>$', '>', new_content), tag_content, pair[0].name)
			editor.replace_content(new_content, pair[0].start, pair[0].end)
		
		return True
	else:
		return False
	

def get_line_bounds(text, pos):
	"""
	Returns line bounds for specific character position
	@type text: str
	@param pos: Where to start searching
	@type pos: int
	@return: list
	"""
	start = 0
	end = len(text) - 1
	
	# search left
	for i in range(pos - 1, 0, -1):
		if text[i] in '\n\r':
			start = i + 1
			break
		
	# search right
	for i in range(pos, len(text)):
		if text[i] in '\n\r':
			end = i
			break
		
	return start, end

def remove_tag(editor):
	"""
	Gracefully removes tag under cursor
	@type editor: ZenEditor
	"""
	caret_pos = editor.get_caret_pos()
	content = editor.get_content()
		
	# search for tag
	pair = html_matcher.get_tags(content, caret_pos, editor.get_profile_name())
	if pair and pair[0]:
		if not pair[1]:
			# simply remove unary tag
			editor.replace_content(zen_coding.get_caret_placeholder(), pair[0].start, pair[0].end)
		else:
			tag_content_range = narrow_to_non_space(content, pair[0].end, pair[1].start)
			start_line_bounds = get_line_bounds(content, tag_content_range[0])
			start_line_pad = get_line_padding(content[start_line_bounds[0]:start_line_bounds[1]])
			tag_content = content[tag_content_range[0]:tag_content_range[1]]
				
			tag_content = unindent_text(tag_content, start_line_pad)
			editor.replace_content(zen_coding.get_caret_placeholder() + tag_content, pair[0].start, pair[1].end)
		
		return True
	else:
		return False