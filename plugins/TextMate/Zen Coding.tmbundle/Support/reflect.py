"""
Special version of Reflect CSS value for TextMate
"""
import zencoding
import zencoding.actions.token as token_actions
from zencoding.actions.basic import unindent

@zencoding.action
def reflect_css_value_textmate(editor):
	"""
	Reflect CSS value: takes rule's value under caret and pastes it for the same 
	rules with vendor prefixes
	@param editor: ZenEditor
	"""
	if editor.get_syntax() != 'css':
		return False
	
	result = token_actions.do_css_refelction(editor)
	if result:
		sel_start, sel_end = editor.get_selection_range()
		
		#add tabstob for selection
		marker = '${0}'
		caret_pos = result['caret'] - result['start']
		if sel_start != sel_end:
			marker = '${0:' + result['data'][caret_pos:caret_pos + sel_end - sel_start] + '}'
			
		data = result['data'][0:caret_pos] + marker + result['data'][caret_pos + sel_end - sel_start:]
		editor.replace_content(unindent(editor, data), result['start'], result['end'], True)
		return True
	
	return False