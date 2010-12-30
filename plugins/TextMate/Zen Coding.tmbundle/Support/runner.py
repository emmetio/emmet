#!/usr/bin/env python
# -*- coding: utf-8 -*-

from zencoding import zen_core as zen_coding
from zen_editor import ZenEditor
import sys

editor = ZenEditor()
try:
	args = sys.argv[2:]
except:
	args = []
	
zen_coding.run_action(sys.argv[1], editor, *args)
