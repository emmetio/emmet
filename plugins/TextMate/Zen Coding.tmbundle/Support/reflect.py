"""
Special version of Reflect CSS value for TextMate
"""
import zencoding
import zencoding.actions.token as token_actions
from zencoding.utils import unindent

def compound_update(editor, data):
	if data:
		text = data['data']
		sel_start, sel_end = editor.get_selection_range()
		
		#add tabstob for selection
		marker = '${0}'
		caret_pos = data['caret'] - data['start']
		if sel_start != sel_end:
			marker = '${0:' + data['data'][caret_pos:caret_pos + sel_end - sel_start] + '}'
			
		text = text[0:caret_pos] + marker + text[caret_pos + sel_end - sel_start:]
		
		editor.replace_content(unindent(editor, text), data['start'], data['end'], True)
		return True
		
	return False

@zencoding.action
def reflect_css_value_textmate(editor):
	"""
	Reflect CSS value: takes rule's value under caret and pastes it for the same 
	rules with vendor prefixes
	@param editor: ZenEditor
	"""
	if editor.get_syntax() != 'css':
		return False
	
	return compound_update(editor, token_actions.do_css_reflection(editor))

@zencoding.action
def update_image_size_textmate(editor):
	"""
	Update image size: reads image from image/CSS rule under caret
	and updates dimensions inside tag/rule
	@type editor: ZenEditor
	"""
	if editor.get_syntax() == 'css':
		result = token_actions.update_image_size_css(editor)
	else:
		result = token_actions.update_image_size_html(editor)
	
	return compound_update(editor, result)