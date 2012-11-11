h1. Emmet (ex-Zen Coding) — a new way of writing HTML and CSS code

Emmet is a toolkit for high-speed HTML, XML, XSL (or any other structured code format) coding and editing. The core of this plugin is a powerful abbreviation engine which allows you to expand expressions—similar to CSS selectors—into HTML code. For example:

@div#page>div.logo+ul#navigation>li*5>a@

...can be expanded into:

<pre><code>
<div id="page">
	<div class="logo"></div>
	<ul id="navigation">
		<li><a href=""></a></li>
		<li><a href=""></a></li>
		<li><a href=""></a></li>
		<li><a href=""></a></li>
		<li><a href=""></a></li>
	</ul>
</div>
</code></pre>

"Read more about current Emmet syntax":http://code.google.com/p/zen-coding/wiki/ZenHTMLSelectorsEn

Abbreviation engine has a modular structure which allows you to expand abbreviations into different languages. Emmet currently supports CSS, HTML, XML/XSL and HAML languages via "filters":http://code.google.com/p/zen-coding/wiki/Filters.

h2. Current features of abbreviation engine

* ID and CLASS attributes: @div#page.section.main@.
* Custom attributes: @div[title]@, @a[title="Hello world" rel]@, @td[colspan=2]@.
* Element multiplication: @li*5@ will output @<li>@ tag five times.
* Item numbering with $ character: @li.item$*3@ will output @<li>@ tag three times, replacing $ character with item number.
* Multiple '$' characters in a row are used as zero padding, i.e.: @li.item$$$@ → @li.item001@
* Abbreviation groups with unlimited nesting: @div#page>(div#header>ul#nav>li*4>a)+(div#page>(h1>span)+p*2)+div#footer@. You can literally write a full document markup with just a single line.
* "Filters":http://code.google.com/p/zen-coding/wiki/Filters support
* @div@ tag name can be omitted when writing element starting from ID or CLASS: @#content>.section@ is the same as @div#content>div.section@.

To better understand how Emmet works, watch "demo video":http://vimeo.com/7405114 and read "Smashing Magazine tutorial":http://www.smashingmagazine.com/2009/11/21/zen-coding-a-new-way-to-write-html-code/.

Emmet isn’t only a decent abbreviation engine, it also provides some very useful actions for HTML-coder’s every day needs, like: _Wrap with Abbreviation_, _Tag Balancing_, _Toggle Comment_, _Remove Tag_ etc. "Read more about available actions":http://code.google.com/p/zen-coding/wiki/Actions.

h2. Officially supported editors

These plugins are developed by Emmet team and guarantee to have full support of all Emmet latest features.

* *Aptana/Eclipse* (crossplatform) — "Emmet for Eclipse":https://github.com/sergeche/eclipse-zencoding 
* *TextMate* (Mac) — "external download":https://github.com/emmetio/emmet-objc/downloads
* *Coda 1.6 and 2.x* (Mac) — "external download":https://github.com/emmetio/emmet-objc/downloads
* *Espresso* (Mac) — "external download":https://github.com/emmetio/emmet-objc/downloads
* *Komodo Edit/IDE* (crossplatform) — "external download":http://community.activestate.com/xpi/zen-coding
* *Notepad++* (Windows)
* *PSPad* (Windows)
* *@<textarea>@* (browser-based). See "online demo":http://zen-coding.ru/textarea/.
* *CodeMirror2* (browser-based). See "online demo":http://media.chikuyonok.ru/codemirror2/.

h2. Third-party supported editors

These plugins are using official Emmet engine and developed by third-party developers. Thus, no guarantee that they support all latest ZC features.

* *Dreamweaver* (Windows, Mac)
* *Sublime Text* (Windows)
* *UltraEdit* (Windows)
* *TopStyle* (Windows)
* *GEdit* (crossplatform) — "Franck Marcia's plugin":http://github.com/fmarcia/zen-coding-gedit, "Mike Crittenden's plugin":http://github.com/mikecrittenden/zen-coding-gedit
* *BBEdit/TextWrangler* (Mac) — "external download":http://www.angelwatt.com/coding/zen-coding_bbedit.php
* *Visual Studio* (Windows) — "external download":http://zencoding.codeplex.com/
* *EmEditor* (Windows) — "external download":http://www.emeditor.com/modules/mydownloads/singlefile.php?cid=18&lid=281
* *Sakura Editor* (Windows) — "external download":http://mwlab.net/zen-coding-for-sakuraeditor
* *NetBeans* (crossplatform) — "external download":http://github.com/lorenzos/ZenCodingNetBeansPlugin#readme
* *Chrome Extension* — "external download":https://chrome.google.com/extensions/detail/iodhcpffklplnfaihoolhfbejbinhcgn
* *ShiftEdit* – "online IDE":http://shiftedit.net

h2. Unofficial implementations

These plugins are developed by third-party and has their own ZC engine implementation, which leads to different feature set and abbreviation syntax. Emmet team has no relation to this projects.

* *IntelliJ IDEA/WebStorm/PHPStorm* (crossplatform) — built-in in latest versions
* *Emacs* (crossplatform) — "external download":http://www.emacswiki.org/emacs/ZenCoding
* *Vim* (crossplatform) — "Sparkup":http://github.com/rstacruz/sparkup, "Zen Coding for Vim":http://www.vim.org/scripts/script.php?script_id=2981
* "ReSharper plugin":http://confluence.jetbrains.net/display/ReSharper/ZenCoding for *Visual Studio*

h2. Development

* "Plugin HOWTO":http://wiki.github.com/sergeche/zen-coding/plugin-howto
* "Release notes":https://github.com/sergeche/zen-coding/wiki/Release-Notes
