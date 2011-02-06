#!/usr/bin/env python
# -*- coding: utf-8 -*-

from zen_editor import ZenEditor
import zencoding

# This is a special variable; if it exists in a module, the module will be
# passed the actionObject as the second parameter
req_action_object = True

def act(context, actionObject, action_name, undo_name=None):
    zen_editor = ZenEditor(context, actionObject)
    
    if action_name == 'wrap_with_abbreviation':
        abbr = actionObject.userInput().stringValue()
        if abbr:
            return zencoding.run_action(action_name, zen_editor, abbr)
    else:
        return zencoding.run_action(action_name, zen_editor)
            
    return False