#!/usr/bin/env python
# -*- coding: utf-8 -*-

import zencoding
from zencoding.actions import *
import sys
from zen_editor import ZenEditor

editor = ZenEditor()
try:
	args = sys.argv[2:]
except:
	args = []
	
zencoding.run_action(sys.argv[1], editor, *args)
