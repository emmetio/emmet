'''
Created on Jun 15, 2009

@author: sergey
'''
from zencoding.zen_settings import zen_settings
from zencoding import zen_resources

zen_resources.set_vocabulary(zen_settings, zen_resources.VOC_USER)
print(zen_resources.get_abbreviation('html', 'a'))
print(zen_resources.get_snippet('html', 'cc:ie6'))
print(zen_resources.get_variable('lang'))