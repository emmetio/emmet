#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os.path
import sys

# import all filters
__sub_modules = []

for file in os.listdir(os.path.dirname(__file__)):
	name, ext = os.path.splitext(file)
	if ext.lower() == '.py':
		__sub_modules.append(name)
		
__import__(__name__, globals(), locals(), __sub_modules)

del __sub_modules