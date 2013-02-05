emmet.require('resources').setVocabulary({
	html: {
		abbreviations: {
			'egr+': 'div#head>(ul#nav>li*3>(div.subnav>p)+(div.othernav))+div#footer',
			'demo': '<div id="demo"></div>'
		},
		
		snippets: {
			'dol': '\\$db->connect()\n\t\\$\\$\\$more dollaz$',
			'c': '<!-- |${child} -->',
			'djb': '{% block ${id} %}\n\t${child}|\n{% endblock %}',
			'attr': 'hello ${id} ${name}',
			'blank': ' target="_blank"',
			'erb': '<%= |${child} %>'
		},
		
		filters: 'bem,html'
		
//		, profile: {
//			tag_case: 'upper',
//			attr_case: 'upper',
//			attr_quotes: 'double',
//			tag_nl: 'decide',
//			place_cursor: true,
//			indent: true,
//			inline_break: 3,
//			self_closing_tag: 'xhtml',
//			filters: ''
//		}
	},
	
	'css': {
		'snippets': {
			'mm': '@media (min-width: ${class}px) {\n\t|\n}',
			'm0a': 'margin: 0 auto!!;'
		}
	}
}, 'user');