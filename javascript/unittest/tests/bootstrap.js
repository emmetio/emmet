/**
 * @param {Function} require
 * @param {Underscore} _
 */
emmet.exec(function(require, _) {
	var payload = {
		snippets: {
			html: {
				abbreviations: {
					test: 'span.test'
				}
			},
			css: {
				snippets: {
					test: 'test-prop:${0};'
				}
			}
		},
		
		preferences: {
			demo: '2'
		},
		
		profiles: {
			test: {
				tag_case: 'upper'
			}
		},
		
		syntaxprofiles: {
			html: {
				tag_case: 'upper'
			},
			css: {
				'filters': 's'
			}
		}
	};
	
	module('Bootstrap');
	test('Loader', function() {
		var preferences = require('preferences');
		preferences.define('demo', '1');
		require('bootstrap').loadUserData(payload);
		
		equal(preferences.get('demo'), '2', 'Loaded preferences');
		ok(require('profile').get('test'), 'Loaded profile');
		equal(emmet.expandAbbreviation('test', 'html'), '<SPAN class="test">${0}</SPAN>', 'Loaded user snippets and syntax profile');
		
		
		// cleanup
		preferences.remove('demo');
		require('bootstrap').resetSnippets();
	});
});