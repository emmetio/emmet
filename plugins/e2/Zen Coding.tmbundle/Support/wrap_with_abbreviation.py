#!/usr/bin/env python
# -*- coding: utf-8 -*-
from zencoding import zen_core as zen_coding
from zen_editor import ZenEditor

editor = ZenEditor()
abbr = editor.prompt('Enter abbreviation')
if abbr is not None:
	zen_coding.run_action('wrap_with_abbreviation', editor, abbr)