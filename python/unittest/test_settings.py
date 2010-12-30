'''
Created on Jun 15, 2009

@author: sergey
'''
from zencoding.zen_settings import zen_settings
from zencoding import zen_core as zen
from zencoding import zen_resources

zen.set_caret_placeholder('|')

def expandAbbr(abbr, doc_type='html', profile_name='plain'):
	return zen.expand_abbreviation(abbr, doc_type, profile_name)

zen_resources.set_vocabulary(zen_settings, zen_resources.VOC_SYSTEM)
#print(zen_resources.get_abbreviation('html', 'a'))
#print(zen_resources.get_snippet('html', 'cc:ie6'))
#print(zen_resources.get_variable('lang'))

#print(expandAbbr('p.name+p+a'))
print(expandAbbr('span>{Hello world}'))