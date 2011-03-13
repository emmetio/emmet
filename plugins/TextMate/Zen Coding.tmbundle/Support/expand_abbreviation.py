#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import re
import zencoding
import zencoding.utils
from zen_editor import ZenEditor

editor = ZenEditor()

"""
In order to make "Expand Abbreviation" more natural to
TextMate's bundle system we have to forget about predefined Zen Coding actions
and write our own
"""

cur_line = os.getenv('TM_CURRENT_LINE', '')
cur_index = int(os.getenv('TM_LINE_INDEX', 0))
line = cur_line[0:cur_index]

abbr = os.getenv('TM_SELECTED_TEXT', '')
if not abbr:
	abbr = zencoding.utils.extract_abbreviation(line)


output = zencoding.utils.escape_text(line) + '$0' + zencoding.utils.escape_text(cur_line[cur_index:])

if abbr:
	try:
		result = line[0:-len(abbr)] + zencoding.expand_abbreviation(abbr, editor.get_syntax(), editor.get_profile_name())
		cur_line_pad = re.match(r'^(\s+)', cur_line)
		if cur_line_pad:
			result = zencoding.utils.pad_string(result, cur_line_pad.group(1))
		
		output = editor.add_placeholders(result) + zencoding.utils.escape_text(cur_line[cur_index:])
	except:
		pass
	
sys.stdout.write(output)
