'''
@author Sergey Chikuyonok (serge.che@gmail.com)
@link http://chikuyonok.ru
'''
import zencoding

@zencoding.action('test')
def my_action(n):
	print(n)
	
@zencoding.action
def second_action(n):
	print(n)
	
zencoding.get_action('test')('Hello')
zencoding.get_action('second_action')('Helo')