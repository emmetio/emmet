#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''
High-level editor interface that communicates with TextMate editor.
In order to work correctly, you should set set the commands 
input to “Entire Document”
 
@author Sergey Chikuyonok (serge.che@gmail.com)
@link http://chikuyonok.ru
'''
import os
import sys
import zencoding
import zencoding.utils as zen
import subprocess
import re

class ZenEditor():
	def __init__(self, context=None):
		self._content = ''
		"Editor's content"
		
		self.apple_script = os.path.join(os.getenv('TM_BUNDLE_SUPPORT'), 'pasteboard.scpt')
		zen.set_newline(os.getenv('TM_LINE_ENDING', zen.get_newline()))		
		self.set_context(context)

	def set_context(self, context=None):
		"""
		Setup underlying editor context. You should call this method 
		<code>before</code> using any Zen Coding action.
		@param context: context object
		"""
		self._content = sys.stdin.read().decode('utf-8')
		
		# setup variables 
		for k, v in os.environ.items():
			m = re.match(r'^zc_var_(.+)', k.lower())
			if m:
				zen.set_variable(m.group(1), v)
				
	def _get_head_len(self, line_num):
		head_lines = self.get_content().splitlines(True)[0:line_num - 1]
		return len(u''.join(head_lines))
	
	def _get_current_line_num(self):
		return int(os.getenv('TM_INPUT_START_LINE', os.getenv('TM_LINE_NUMBER', 1)))
		
	def get_selection_range(self):
		"""
		Returns character indexes of selected text
		@return: list of start and end indexes
		"""
		head_len = self._get_head_len(self._get_current_line_num())
		cur_pos = int(os.getenv('TM_INPUT_START_COLUMN', os.getenv('TM_COLUMN_NUMBER', 1))) - 1
		
		# we need to expand tabbed indentation in order to correctly 
		# calculate precise caret position
		m = re.match(r'\t+', self.get_current_line())
		if m:
			tab_size = int(os.getenv('TM_TAB_SIZE', 1))
			cur_pos -= len(m.group(0)) * (tab_size - 1)
		
		return head_len + cur_pos, head_len + cur_pos + len(self.get_selection())
	
	
	def create_selection(self, start, end=None):
		"""
		Creates selection from <code>start</code> to <code>end</code> character
		indexes. If <code>end</code> is ommited, this method should place caret 
		and <code>start</code> index
		"""
		self.set_caret_pos(start)
		if end is not None:
			selected_text = self.get_content()[start:end].encode('utf-8')
			# copy selected text to Mac OS' pasteboard to use it 
			# as a part of macros sequence for 'find next' action
			subprocess.Popen(['pbcopy', '-pboard', 'find'], stdin=subprocess.PIPE).communicate(selected_text)
	
	def get_current_line_range(self):
		"""
		Returns current line's start and end indexes
		@return: list of start and end indexes
		@example
		start, end = zen_editor.get_current_line_range();
		print('%s, %s' % (start, end))
		"""
		start = self._get_head_len(self._get_current_line_num())
		return start, start + len(self.get_current_line())
	
	def get_caret_pos(self):
		""" Returns current caret position """
		return self.get_selection_range()[0]
	
	def set_caret_pos(self, pos):
		"""
		Set new caret position
		@type pos: int
		"""
		# figure out line and column vars
		head = zen.split_by_lines(self.get_content()[0:pos])
		line = max(len(head), 1)
		column = pos - len(zen.get_newline().join(head[0:-1]))
		
		subprocess.Popen(['open', 'txmt://open/?line=%d&column=%d' % (line, column)]).communicate()
	
	def get_current_line(self):
		"""
		Returns content of current line
		@return: str
		"""
		return os.getenv('TM_CURRENT_LINE', '').decode('utf-8')
	
	def replace_content(self, value, start=None, end=None, no_indent=False):
		"""
		Replace editor's content or it's part (from <code>start</code> to 
		<code>end</code> index). If <code>value</code> contains 
		<code>caret_placeholder</code>, the editor will put caret into 
		this position. If you skip <code>start</code> and <code>end</code>
		arguments, the whole target's content will be replaced with 
		<code>value</code>. 
		
		If you pass <code>start</code> argument only,
		the <code>value</code> will be placed at <code>start</code> string 
		index of current content. 
		
		If you pass <code>start</code> and <code>end</code> arguments,
		the corresponding substring of current target's content will be 
		replaced with <code>value</code> 
		@param value: Content you want to paste
		@type value: str
		@param start: Start index of editor's content
		@type start: int
		@param end: End index of editor's content
		@type end: int
		"""
		# For content replacement we need to use macro syntaxt.
		# First, create selection and then write AppleScript file that
		# will replace selected text with new one
		if start is None: start = 0
		if end is None: end = len(self.get_content())
		self.create_selection(start, end)
		
		value = self.add_placeholders(value).encode('utf-8')
		
		fp = open(self.apple_script, 'w')
		fp.write('tell application "TextMate" to insert "%s" with as snippet' % (value.replace('\\', '\\\\').replace('"', '\\"'),))
		fp.close()
		
	
	def get_content(self):
		"""
		Returns editor's content
		@return: str
		"""
		return self._content
	
	def get_syntax(self):
		"""
		Returns current editor's syntax mode
		@return: str
		"""
		scope = os.getenv('TM_SCOPE')
		default_type = 'html'
		doc_type = None
		try:
			if 'xsl' in scope:
				doc_type = 'xsl'
			else:
				doc_type = re.findall(r'\bhtml|css|xml|haml\b', scope)[-1]
		except:
			doc_type = default_type
		
		if not doc_type: doc_type = default_type
		
		return doc_type
	
	def get_profile_name(self):
		"""
		Returns current output profile name (@see zen_coding#setup_profile)
		@return {String}
		"""
		return os.getenv('ZC_PROFILE', 'xhtml')
	
	def run_applescript(self):
		"""
		TextMate-specific action that calls AppleScript defined in 
		<code>replace_content()</code> method which replaces selected text
		with new one
		"""
		if os.path.exists(self.apple_script):
			subprocess.Popen(['osascript', self.apple_script], stderr=subprocess.PIPE).communicate()
			os.remove(self.apple_script)
			
	def prompt(self, title):
		"""
		Prompt user with CocoaDialog
		@param title: Popup title
		@return: str
		"""
		args = ['CocoaDialog', 'standard-inputbox', '--title', title, '‑‑no‑newline']
		p = subprocess.Popen(args, stdout=subprocess.PIPE).communicate()
		
		output = p[0].splitlines()
		if output[0] == '2' or not output[1]:
			return None
		else:
			return output[1].decode('utf-8')
		
	def add_placeholders(self, text):
		_ix = [1000]
		
		def get_ix(m):
			_ix[0] += 1
			return '${%s}' % _ix[0]
		
		return re.sub(zen.get_caret_placeholder(), get_ix, text)
	
	def get_selection(self):
		return os.getenv('TM_SELECTED_TEXT', '').decode('utf-8')
	
	def get_file_path(self):
		"""
		Returns current editor's file path
		@return: str
		@since: 0.65 
		"""
		return os.getenv('TM_FILEPATH', '').decode('utf-8')