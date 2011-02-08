'''
@author Sergey Chikuyonok (serge.che@gmail.com)
@link http://chikuyonok.ru
'''
import tea_actions as tea
import zencoding.utils
from zen_editor import ZenEditor
import sys
import traceback

class SimpleWriter():
	def __init__(self):
		self.lines = []
	
	def write(self, line):
		self.lines.append(line)
	
	def get(self):
		return '\n'.join(self.lines)

def act(controller, bundle, options):
	context = tea.get_context(controller)
	action_name = tea.get_option(options, 'action', '')
	editor = ZenEditor(context, bundle)
	
	try:
		return zencoding.run_action(action_name, editor)
	except zencoding.utils.ZenError:
		tea.say(context, 'Error while performing Zen Coding action', sys.exc_info()[1].value)
	except:
		msg_writer = SimpleWriter()
		msg = traceback.print_tb(file=msg_writer)
		tea.say(context, 'Runtime error', msg_writer.get())
		