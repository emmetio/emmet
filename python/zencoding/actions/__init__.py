#!/usr/bin/env python
# -*- coding: utf-8 -*-

# import all actions
import os
__sub_modules = []

for file in os.listdir(os.path.dirname(__file__)):
	name, ext = os.path.splitext(file)
	if ext.lower() == '.py':
		__sub_modules.append(name)
		
__import__(__name__, globals(), locals(), __sub_modules)

del __sub_modules