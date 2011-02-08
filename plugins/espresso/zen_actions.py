#!/usr/bin/env python
# -*- coding: utf-8 -*-

from zen_editor import ZenEditor
import zencoding.utils
import sys
import traceback
import tea_actions as tea

# This is a special variable; if it exists in a module, the module will be
# passed the actionObject as the second parameter
req_action_object = True

class SimpleWriter():
	def __init__(self):
		self.lines = []
	
	def write(self, line):
		self.lines.append(line)
	
	def get(self):
		return '\n'.join(self.lines)

def act(context, actionObject, action_name, undo_name=None):
	zen_editor = ZenEditor(context, actionObject)

	try:
		if action_name == 'wrap_with_abbreviation':
			abbr = actionObject.userInput().stringValue()
			if abbr:
				return zencoding.run_action(action_name, zen_editor, abbr)
		else:
			return zencoding.run_action(action_name, zen_editor)
	except zencoding.utils.ZenError:
		tea.say(context, 'Error while performing Zen Coding action', sys.exc_info()[1].value)
	except:
		msg_writer = SimpleWriter()
		msg = traceback.print_exc(file=msg_writer, limit=5)
		tea.say(context, 'Runtime error', msg_writer.get())

	return False
