How to install
=========================================

Just click on "TEA for Espresso.sugar" bundle or drag'n'drop it on Espresso app
icon.


How to change keyboard shortcuts
==========================================
If you don't like default key bindings for Zen Coding actions, you can go to
Mac OS' System Preferences > Keyboard > Keyboard Shortcuts. 
Pick "Application Shortcuts" on the left pane and then click on "+" button
and follow the instructions.


How to add new abbreviations and snippets
=========================================
To add new Zen Coding abbreviatoins and snippets you should create 
"my_zen_settings.py" file in your home folder (i.e. ~/my_zen_settings.py) and
create "my_zen_settings" variable in it. For example, in order to add 'mydiv' 
abbreviation for HTML syntax, the "my_zen_settings.py" content should look like 
this:
 
my_zen_settings = {
	'html': {
		'abbreviations': {
			'mydiv': '<div id="mydiv"></div>'
		}
	}
}

You should refer to original "zen_settings.py" file for examples:
https://github.com/sergeche/zen-coding/blob/master/python/zencoding/zen_settings.py

...or read Smashing Magazine's tutorial:
http://www.smashingmagazine.com/2009/11/21/zen-coding-a-new-way-to-write-html-code/