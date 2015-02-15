# Emmet — the essential toolkit for web-developers 

[![Get Support](http://codersclan.net/graphics/getSupport_github4.png)](http://codersclan.net/support/step1.php?repo_id=4)

Emmet (formerly *Zen Coding*) is a web-developer’s toolkit that can greatly improve your HTML & CSS workflow.

With Emmet, you can type CSS-like expressions that can be dynamically parsed, and produce output depending on what you type in the abbreviation. Emmet is developed and optimised for web-developers whose workflow depends on HTML/XML and CSS, but can be used with programming languages too.

For example, this abbreviation:

    ul#nav>li.item$*4>a{Item $}

...can be expanded into:

	<ul id="nav">
		<li class="item1"><a href="">Item 1</a></li>
		<li class="item2"><a href="">Item 2</a></li>
		<li class="item3"><a href="">Item 3</a></li>
		<li class="item4"><a href="">Item 4</a></li>
	</ul>

[Learn more about Emmet features](http://docs.emmet.io)

## This fork adds Corporate babble feature words to Emmet

Use corpem10 to generate ten corporate babble words, corpem20 to generate twenty words. Works exactly like lorem generator and can be used where you can use lorem generator.

In your preferences.json file add the following two preferences. Presently only english language corporate words have been filled. The common part is true by default as common parts in corporate words can be avoided to ensure generating truly random corporate sounding words.

	'corpem.defaultLang', 'en',
	'corpem.omitCommonPart', true
