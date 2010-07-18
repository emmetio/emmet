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
import zencoding.zen_core as zen
import subprocess
import re
import hessian

class ZenEditor():
	def __init__(self, context=None):
		self.set_context(context)

	def set_context(self, context=None):
		"""
		Setup underlying editor context. You should call this method 
		<code>before</code> using any Zen Coding action.
		@param context: context object
		"""
		self.context = hessian.Hessian()
		self.editor = self.context.GetActiveEditor()
		
		if self.context.IsSoftTabs():
			indent = zen.repeat_string(' ', self.context.GetTabWidth());
			zen.set_variable('indentation', indent);
		
	def get_selection_range(self):
		"""
		Returns character indexes of selected text
		@return: list of start and end indexes
		"""
		sels = self.editor.GetSelections()
		if sels:
			sel = sels[0]
			return sel[0], sel[1]
		else:
			pos = self.editor.GetPos()
			return pos, pos
	
	
	def create_selection(self, start, end=None):
		"""
		Creates selection from <code>start</code> to <code>end</code> character
		indexes. If <code>end</code> is ommited, this method should place caret 
		and <code>start</code> index
		"""
		if end is not None:
			self.editor.Select(start, end)
		else:
		    self.editor.SetPos(start)
	
	def get_current_line_range(self):
		"""
		Returns current line's start and end indexes
		@return: list of start and end indexes
		@example
		start, end = zen_editor.get_current_line_range();
		print('%s, %s' % (start, end))
		"""
		line_id = self.editor.GetCurrentLine()
		line_range = self.editor.GetLineRange(line_id)
		return line_range[0], line_range[1]
	
	def get_caret_pos(self):
		""" Returns current caret position """
		return self.editor.GetPos()
	
	def set_caret_pos(self, pos):
		"""
		Set new caret position
		@type pos: int
		"""
		self.editor.SetPos(pos)
	
	def get_current_line(self):
		"""
		Returns content of current line
		@return: str
		"""
		line_id = self.editor.GetCurrentLine()
		return self.editor.GetLineText(line_id)
	
	def replace_content(self, value, start=None, end=None):
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
		if start is None: start = 0
		if end is None: end = self.editor.GetLength()
		self.create_selection(start, end)
		
		value = self.add_placeholders(value)
		
		self.editor.InsertSnippet(value)
		
	def log(self, value):
		self.context.Log(value)
		
	
	def get_content(self):
		"""
		Returns editor's content
		@return: str
		"""
		return self.editor.GetText()
	
	def get_syntax(self):
		"""
		Returns current editor's syntax mode
		@return: str
		"""
		scope = self.editor.GetScope()
		default_type = 'html'
		doc_type = None
		try:
			if 'xsl' in scope[0]:
				doc_type = 'xsl'
			else:
				doc_type = re.findall(r'\bhtml|css|xml|haml\b', scope[0])[-1]
		except:
			doc_type = default_type
		
		if not doc_type: doc_type = default_type
		
		return doc_type
	
	def get_profile_name(self):
		"""
		Returns current output profile name (@see zen_coding#setup_profile)
		@return {String}
		"""
		return 'xhtml'
	
	def prompt(self, title):
		"""
		Prompt user with CocoaDialog
		@param title: Popup title
		@return: str
		"""
		text = self.editor.Prompt(title)
		if not text:
			return None
		else:
			return text
		
	def add_placeholders(self, text):
		_ix = [0]
		
		def get_ix(m):
			_ix[0] += 1
			return '$%s' % _ix[0]
		
		text = re.sub(r'\$', '\\$', text)
		return re.sub(zen.get_caret_placeholder(), get_ix, text)
	
	def get_selection(self):
		"""
		Returns current selection
		@return: str
		@since: 0.65
		"""
		start, end = self.get_selection_range()
		return self.get_content()[start:end] if start != end else ''
	
	def get_file_path(self):
		"""
		Returns current editor's file path
		@return: str
		@since: 0.65 
		"""
		return os.getenv('TM_FILEPATH', None)
