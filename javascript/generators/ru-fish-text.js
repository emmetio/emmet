/**
 * "Lorem ipsum" text generator. Matches <code>lipsumru(num)?</code> or 
 * <code>loremru(num)?</code> abbreviation.
 * This code is based on Django's contribution: 
 * https://code.djangoproject.com/browser/django/trunk/django/contrib/webdesign/lorem_ipsum.py
 * <br><br>
 * Examples to test:<br>
 * <code>lipsumru</code> – generates 30 words text.<br>
 * <code>lipsumru*6</code> – generates 6 paragraphs (autowrapped with &lt;p&gt; element) of text.<br>
 * <code>ol>lipsumru10*5</code> — generates ordered list with 5 list items (autowrapped with &lt;li&gt; tag)
 * with text of 10 words on each line<br>
 * <code>span*3>lipsumru20</code> – generates 3 paragraphs of 20-words text, each wrapped with &lt;span&gt; element .
 * Each paragraph phrase is unique   
 * @param {Function} require
 * @param {Underscore} _ 
 * @constructor
 * @memberOf __loremIpsumGeneratorDefine
 */
emmet.exec(function(require, _) {
  /**
	 * @param {AbbreviationNode} tree
	 * @param {Object} options
	 */
	require('abbreviationParser').addPreprocessor(function(tree, options) {
		var re = /^(?:loremru|lipsumru)(\d*)$/i, match;
		
		/** @param {AbbreviationNode} node */
		tree.findAll(function(node) {
			if (node._name && (match = node._name.match(re))) {
				var wordCound = match[1] || 30;
				
				// force node name resolving if node should be repeated
				// or contains attributes. In this case, node should be outputed
				// as tag, otherwise as text-only node
				node._name = '';
				node.data('forceNameResolving', node.isRepeating() || node.attributeList().length);
				node.data('pasteOverwrites', true);
				node.data('paste', function(i, content) {
					return paragraph(wordCound, !i);
				});
			}
		});
	});
	
	var COMMON_P = 'далеко-далеко за словесными горами в стране гласных и согласных живут рыбные тексты'.split(' ');
	
	var WORDS = ['далеко-далеко', 'за', 'словесными', 'горами', 'в', 'стране',
	             'гласных', 'и', 'согласных', 'живут', 'рыбные', 'тексты', 'вдали', 
	             'от', 'всех', 'они', 'буквенных', 'домах', 'на', 'берегу', 'семантика', 
	             'большого', 'языкового', 'океана', 'маленький', 'ручеек', 'даль', 
	             'журчит', 'по', 'всей', 'обеспечивает', 'ее','всеми', 'необходимыми', 
	             'правилами', 'эта', 'парадигматическая', 'страна', 'которой', 'жаренные', 
	             'предложения', 'залетают', 'прямо', 'рот', 'даже', 'всемогущая', 
	             'пунктуация', 'не', 'имеет', 'власти', 'над', 'рыбными', 'текстами', 
	             'ведущими', 'безорфографичный', 'образ', 'жизни', 'однажды', 'одна', 
	             'маленькая', 'строчка','рыбного', 'текста', 'имени', 'lorem', 'ipsum', 
	             'решила', 'выйти', 'большой', 'мир', 'грамматики', 'великий', 'оксмокс', 
	             'предупреждал', 'о', 'злых', 'запятых', 'диких', 'знаках', 'вопроса', 
	             'коварных', 'точках', 'с', 'запятой', 'но', 'текст', 'дал', 'сбить', 
	             'себя', 'толку', 'он', 'собрал', 'семь', 'своих', 'заглавных', 'букв', 
	             'подпоясал', 'инициал', 'за', 'пояс', 'пустился', 'дорогу', 
	             'взобравшись', 'первую', 'вершину', 'курсивных', 'гор', 'бросил', 
	             'последний', 'взгляд', 'назад', 'силуэт', 'своего', 'родного', 'города', 
	             'буквоград', 'заголовок', 'деревни', 'алфавит', 'подзаголовок', 'своего', 
	             'переулка', 'грустный', 'реторический', 'вопрос', 'скатился', 'его', 
	             'щеке', 'продолжил', 'свой', 'путь', 'дороге', 'встретил', 'рукопись', 
	             'она', 'предупредила',  'моей', 'все', 'переписывается', 'несколько', 
	             'раз', 'единственное', 'что', 'меня', 'осталось', 'это', 'приставка', 
	             'возвращайся', 'ты', 'лучше', 'свою', 'безопасную', 'страну', 'послушавшись', 
	             'рукописи', 'наш', 'продолжил', 'свой', 'путь', 'вскоре', 'ему', 
	             'повстречался', 'коварный', 'составитель', 'рекламных', 'текстов', 
	             'напоивший', 'языком', 'речью', 'заманивший', 'свое', 'агенство', 
	             'которое', 'использовало', 'снова', 'снова', 'своих', 'проектах', 
	             'если', 'переписали', 'то', 'живет', 'там', 'до', 'сих', 'пор'];
	
	/**
	 * Returns random integer between <code>from</code> and <code>to</code> values
	 * @param {Number} from
	 * @param {Number} to
	 * @returns {Number}
	 */
	function randint(from, to) {
		return Math.round(Math.random() * (to - from) + from);
	}
	
	/**
	 * @param {Array} arr
	 * @param {Number} count
	 * @returns {Array}
	 */
	function sample(arr, count) {
		var len = arr.length;
		var iterations = Math.min(len, count);
		var result = [];
		while (result.length < iterations) {
			var randIx = randint(0, len - 1);
			if (!_.include(result, randIx))
				result.push(randIx);
		}
		
		return _.map(result, function(ix) {
			return arr[ix];
		});
	}
	
	function choice(val) {
		if (_.isString(val))
			return val.charAt(randint(0, val.length - 1));
		
		return val[randint(0, val.length - 1)];
	}
	
	function sentence(words, end) {
		if (words.length) {
			words[0] = words[0].charAt(0).toUpperCase() + words[0].substring(1);
		}
		
		return words.join(' ') + (end || choice('?!...')); // more dots that question marks
	}
	
	/**
	 * Insert commas at randomly selected words. This function modifies values
	 * inside <code>words</code> array 
	 * @param {Array} words
	 */
	function insertCommas(words) {
		var len = words.length;
		var totalCommas = 0;
		
		if (len > 3 && len <= 6) {
			totalCommas = randint(0, 1);
		} else if (len > 6 && len <= 12) {
			totalCommas = randint(0, 2);
		} else {
			totalCommas = randint(1, 4);
		}
		
		_.each(sample(_.range(totalCommas)), function(ix) {
			words[ix] += ',';
		});
	}
	
	/**
	 * Generate a paragraph of "Lorem ipsum" text
	 * @param {Number} wordCount Words count in paragraph
	 * @param {Boolean} startWithCommon Should paragraph start with common 
	 * "lorem ipsum" sentence.
	 * @returns {String}
	 */
	function paragraph(wordCount, startWithCommon) {
		var result = [];
		var totalWords = 0;
		var words;
		
		wordCount = parseInt(wordCount, 10);
		
		if (startWithCommon) {
			words = COMMON_P.slice(0, wordCount);
			if (words.length > 5)
				words[4] += ',';
			totalWords += words.length;
			result.push(sentence(words, '.'));
		}
		
		while (totalWords < wordCount) {
			words = sample(WORDS, Math.min(randint(3, 12) * randint(1, 5), wordCount - totalWords));
			totalWords += words.length;
			insertCommas(words);
			result.push(sentence(words));
		}
		
		return result.join(' ');
	}
});
