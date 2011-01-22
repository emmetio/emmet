'''
Created on Jun 15, 2009

@author: sergey
'''
import zencoding.utils

zencoding.utils.set_caret_placeholder('|')

#print(zen_resources.get_abbreviation('html', 'a'))
#print(zen_resources.get_snippet('html', 'cc:ie6'))
#print(zen_resources.get_variable('lang'))

#print(expandAbbr('p.name+p+a'))
print(zencoding.expand_abbreviation('span>{Hello world}'))