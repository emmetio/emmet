'''
High-level editor interface that communicates with underlying editor (like
Espresso, Coda, etc.) or browser.
Basically, you should call <code>set_context(obj)</code> method to
set up undelying editor context before using any other method.

This interface is used by <i>zen_actions.py</i> for performing different
actions like <b>Expand abbreviation</b>

@example
import zen_editor
zen_editor.set_context(obj);
//now you are ready to use editor object
zen_editor.get_selection_range();

@author Sergey Chikuyonok (serge.che@gmail.com)
@link http://chikuyonok.ru
'''
import tea_actions as tea
import zencoding.utils
from zencoding import html_matcher
from zencoding.actions.basic import get_line_padding
import re

class ZenEditor():
	def __init__(self, context=None):
		self._context = None
		if context:
			self.set_context(context)

	def set_context(self, context):
		"""
		Setup underlying editor context. You should call this method
		<code>before</code> using any Zen Coding action.
		@param context: context object
		"""
		self._context = context
		zencoding.utils.set_newline(tea.get_line_ending(context))
		zencoding.utils.set_variable('indentation', tea.get_indentation_string(context))

	def get_selection_range(self):
		"""
		Returns character indexes of selected text
		@return: list of start and end indexes
		@example
		start, end = zen_editor.get_selection_range();
		print('%s, %s' % (start, end))
		"""
		rng = tea.get_range(self._context)
		return rng.location, rng.location + rng.length

	def create_selection(self, start, end=None):
		"""
		Creates selection from <code>start</code> to <code>end</code> character
		indexes. If <code>end</code> is ommited, this method should place caret
		and <code>start</code> index
		@type start: int
		@type end: int
		@example
		zen_editor.create_selection(10, 40)
		# move caret to 15th character
		zen_editor.create_selection(15)
		"""
		if end is None: end = start
		new_range = tea.new_range(start, end - start)
		tea.set_selected_range(self._context, new_range)

	def get_current_line_range(self):
		"""
		Returns current line's start and end indexes
		@return: list of start and end indexes
		@example
		start, end = zen_editor.get_current_line_range();
		print('%s, %s' % (start, end))
		"""
		text, rng = tea.get_line(self._context)
		return rng.location, rng.location + rng.length

	def get_caret_pos(self):
		""" Returns current caret position """
		return self.get_selection_range()[0]

	def set_caret_pos(self, pos):
		"""
		Set new caret position
		@type pos: int
		"""
		self.create_selection(pos)

	def get_current_line(self):
		"""
		Returns content of current line
		@return: str
		"""
		text, rng = tea.get_line(self._context)
		return text

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
		if start is None: start = 0
		if end is None: end = len(self.get_content())
		rng = tea.new_range(start, end - start)
		value = self.add_placeholders(value)
		
		if not no_indent:
			value = zencoding.utils.pad_string(value, get_line_padding(self.get_current_line()))
		
		cursor_loc = value.find('$0')
		if cursor_loc != -1:
			select_range = tea.new_range(cursor_loc + rng.location, 0)
			value = value.replace('$0', '')
			tea.insert_text_and_select(self._context, value, rng, select_range)
		else:
			tea.insert_text(self._context, value, rng)

	def get_content(self):
		"""
		Returns editor's content
		@return: str
		"""
		return self._context.string()

	def get_syntax(self):
		"""
		Returns current editor's syntax mode
		@return: str
		"""
		syntax = 'html'
		
		path = self.get_file_path()
		if path is not None:
			pos = path.rfind('.')
			if pos != -1:
				pos += 1
				syntax = path[pos:]
				
		if syntax == 'less': syntax = 'css'
		elif syntax == 'xslt': syntax = 'xsl'
				
		if not zencoding.resources.has_syntax(syntax):
			syntax = 'html'
					
		# No luck with the extension; check for inline style tags
		if syntax == 'html':
			caret_pos = self.get_caret_pos()
			
			pair = html_matcher.get_tags(self.get_content(), caret_pos)
			if pair and pair[0] and pair[0].type == 'tag'and pair[0].name.lower() == 'style':
				# check that we're actually inside the tag
				if pair[0].end <= caret_pos and pair[1].start >= caret_pos:
					syntax = 'css'
			
		return syntax

	def get_profile_name(self):
		"""
		Returns current output profile name (@see zen_coding#setup_profile)
		@return {String}
		"""
		syntax = self.get_syntax()
		if syntax == 'xsl' or syntax == 'xml':
			return 'xml'
		else:
			return 'xhtml'
		
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
		
	def get_selection(self):
		"""
		Returns current selection
		@return: str
		@since: 0.65
		"""
		start, end = self.get_selection_range()
		return self.get_content()[start:end]
	
	def get_file_path(self):
		"""
		Returns current editor's file path
		@return: str
		@since: 0.65 
		"""
		return self._context.path()
	
	def add_placeholders(self, text):
		_ix = [0]
		
		def get_ix(m):
			if not _ix[0]:
				_ix[0] += 1
				return '$0'
			else:
				return ''
		
		text = re.sub(r'\$', '\\$', text)
		return re.sub(zencoding.utils.get_caret_placeholder(), get_ix, text)
