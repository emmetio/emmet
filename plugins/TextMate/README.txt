How to install
=========================================

Just click on "Zen Coding.tmbundle" file or drag'n'drop it on TextMate app
icon.


Overriding Zen Coding variables
=========================================
Zen Coding has number of variables used inside snippets and abbreviations.
For example, "locale" variable is used as <html lang="${locale}"> in "html:5"
snippet. To change the locale, you can either override it in "my_zen_settings.py"
file (read next section) or define it as Shell Variable in TextMate preferences
(Preferences > Advanced > Shell Variables). For example, to override Zen Coding's 
"locale" variable you should create ZC_VAR_LOCALE shell variable.


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