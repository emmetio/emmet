#!/usr/bin/env python
# -*- coding: utf-8 -*-

import zencoding
import sys
from zen_editor import ZenEditor
import reflect

editor = ZenEditor()
try:
	args = sys.argv[2:]
except:
	args = []

try:	
	zencoding.run_action(sys.argv[1], editor, *args)
except zencoding.utils.ZenError:
	print(sys.exc_info()[1])
