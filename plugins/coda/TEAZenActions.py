'''
@author Sergey Chikuyonok (serge.che@gmail.com)
@link http://chikuyonok.ru
'''
import tea_actions as tea
import zencoding
from zen_editor import ZenEditor

def act(controller, bundle, options):
	context = tea.get_context(controller)
	action_name = tea.get_option(options, 'action', '')
	editor = ZenEditor(context)
	
	return zencoding.run_action(action_name, editor)