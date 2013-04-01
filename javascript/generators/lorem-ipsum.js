/**
 * "Lorem ipsum" text generator. Matches <code>lipsum(num)?</code> or 
 * <code>lorem(num)?</code> abbreviation.
 * This code is based on Django's contribution: 
 * https://code.djangoproject.com/browser/django/trunk/django/contrib/webdesign/lorem_ipsum.py
 * <br><br>
 * Examples to test:<br>
 * <code>lipsum</code> – generates 30 words text.<br>
 * <code>lipsum*6</code> – generates 6 paragraphs (autowrapped with &lt;p&gt; element) of text.<br>
 * <code>ol>lipsum10*5</code> — generates ordered list with 5 list items (autowrapped with &lt;li&gt; tag)
 * with text of 10 words on each line<br>
 * <code>span*3>lipsum20</code> – generates 3 paragraphs of 20-words text, each wrapped with &lt;span&gt; element .
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
		var re = /^(?:lorem|lipsum)(\d*)$/i, match;
		
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
	
	var COMMON_P = 'lorem ipsum dolor sit amet consectetur adipisicing elit'.split(' ');
	
	var WORDS = ['exercitationem', 'perferendis', 'perspiciatis', 'laborum', 'eveniet',
	             'sunt', 'iure', 'nam', 'nobis', 'eum', 'cum', 'officiis', 'excepturi',
	             'odio', 'consectetur', 'quasi', 'aut', 'quisquam', 'vel', 'eligendi',
	             'itaque', 'non', 'odit', 'tempore', 'quaerat', 'dignissimos',
	             'facilis', 'neque', 'nihil', 'expedita', 'vitae', 'vero', 'ipsum',
	             'nisi', 'animi', 'cumque', 'pariatur', 'velit', 'modi', 'natus',
	             'iusto', 'eaque', 'sequi', 'illo', 'sed', 'ex', 'et', 'voluptatibus',
	             'tempora', 'veritatis', 'ratione', 'assumenda', 'incidunt', 'nostrum',
	             'placeat', 'aliquid', 'fuga', 'provident', 'praesentium', 'rem',
	             'necessitatibus', 'suscipit', 'adipisci', 'quidem', 'possimus',
	             'voluptas', 'debitis', 'sint', 'accusantium', 'unde', 'sapiente',
	             'voluptate', 'qui', 'aspernatur', 'laudantium', 'soluta', 'amet',
	             'quo', 'aliquam', 'saepe', 'culpa', 'libero', 'ipsa', 'dicta',
	             'reiciendis', 'nesciunt', 'doloribus', 'autem', 'impedit', 'minima',
	             'maiores', 'repudiandae', 'ipsam', 'obcaecati', 'ullam', 'enim',
	             'totam', 'delectus', 'ducimus', 'quis', 'voluptates', 'dolores',
	             'molestiae', 'harum', 'dolorem', 'quia', 'voluptatem', 'molestias',
	             'magni', 'distinctio', 'omnis', 'illum', 'dolorum', 'voluptatum', 'ea',
	             'quas', 'quam', 'corporis', 'quae', 'blanditiis', 'atque', 'deserunt',
	             'laboriosam', 'earum', 'consequuntur', 'hic', 'cupiditate',
	             'quibusdam', 'accusamus', 'ut', 'rerum', 'error', 'minus', 'eius',
	             'ab', 'ad', 'nemo', 'fugit', 'officia', 'at', 'in', 'id', 'quos',
	             'reprehenderit', 'numquam', 'iste', 'fugiat', 'sit', 'inventore',
	             'beatae', 'repellendus', 'magnam', 'recusandae', 'quod', 'explicabo',
	             'doloremque', 'aperiam', 'consequatur', 'asperiores', 'commodi',
	             'optio', 'dolor', 'labore', 'temporibus', 'repellat', 'veniam',
	             'architecto', 'est', 'esse', 'mollitia', 'nulla', 'a', 'similique',
	             'eos', 'alias', 'dolore', 'tenetur', 'deleniti', 'porro', 'facere',
	             'maxime', 'corrupti'];
	
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

		_.each(_.range(totalCommas), function(ix) {
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