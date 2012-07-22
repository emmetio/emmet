# Installation
 
1. Copy contents of this archive into Notepad++ 'plugins' folder (basically, it's C:\Program Files\Notepad++\plugins\)
2. Restart Notepad++
 
You should see "Zen Coding" menu item in top menu.
If you don't see this item or plugin doesn't work, try to install latest Windows Scripting Host: 
 
http://www.microsoft.com/downloads/details.aspx?FamilyId=01592C48-207D-4BE1-8A76-1C4099D7BBB9&displaylang=en

## Changing keyboard shortcuts

Open `keymap.json` file of this plugin and edit shortcuts for Zen Coding actions. When finished, restart Notepad++
 
## Extending Zen Coding

You can create *zencoding-extensions* folder in Notepad’s plugins folder and put Zen Coding extensions there. All files with `.js` extension will be loaded automatically on editor start. Also, you can place `snippets.json` with your custom snippets (similar to bundled *jN\includes\snippets.json* file) and `preferences.json` with custom modules preferences.
 
## Kudos
 
Zen Coding for Notepad++ is based on jN plugin by sieukrem:
http://www.softwarecanoe.de/jn/
 
This plugin allows you to extend Notepad++ with JavaScript. You can write your own scripts and put them
in 'includes' folder of this plugin.
 
More info (in Russian):
http://sieukrem.habrahabr.ru/blog/86626/
