'''
Class for wrapping text with ZenCoding's abbreviations
@author: Sergey Chikuyonok (serge.che@gmail.com)
'''

from Foundation import *
from AppKit import *
from PyObjCTools import AppHelper
import objc
import tea_actions as tea
import sys
import traceback

import TEASheetLoader

import zencoding
from zen_editor import ZenEditor

class TEAWrapWithAbbreviation(TEASheetLoader.TEASheetLoader):
	abbr = objc.IBOutlet()

	def act(self, controller, bundle, options):
		super(TEAWrapWithAbbreviation, self).loadNib_forController_inBundle_('TEAEnterAbbreviation', controller, bundle)

	@AppHelper.endSheetMethod
	def sheetDidEnd_returnCode_contextInfo_(self, sheet, code, info):
		try:
			if code == 1:
				self.wrap(self.context, self.abbr.stringValue())
			sheet.orderOut_(self)
		except:
			msg_writer = SimpleWriter()
			msg = traceback.print_exc(file=msg_writer)
			tea.log(msg_writer.get())

	def safe_str(self, text):
		"""
		Creates safe string representation to deal with Python's encoding issues
		"""
		return text.encode('utf-8')

	def wrap(self, context, abbr):
		# Set up the config variables
		if abbr:
			editor = ZenEditor(context)
			return zencoding.run_action('wrap_with_abbreviation', editor, abbr)
		else:
			return False


class SimpleWriter():
	def __init__(self):
		self.lines = []
	
	def write(self, line):
		self.lines.append(line)
	
	def get(self):
		return '\n'.join(self.lines)
