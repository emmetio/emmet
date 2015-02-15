/**
 * "Corpem" Corporate babble text generator. Matches <code>corpem(num)?</code> or 
 * <code>corpem(num)?</code> abbreviation.
 * This code is based on Django's contribution: 
 * https://code.djangoproject.com/browser/django/trunk/django/contrib/webdesign/corpem_ipsum.py
 * <br><br>
 * Examples to test:<br>
 * <code>corpem</code> – generates 30 words text.<br>
 * <code>corpem*6</code> – generates 6 paragraphs (autowrapped with &lt;p&gt; element) of text.<br>
 * <code>ol>corpem10*5</code> — generates ordered list with 5 list items (autowrapped with &lt;li&gt; tag)
 * with text of 10 words on each line.<br>
 * <code>span*3>corpem20</code> – generates 3 paragraphs of 20-words text, each wrapped with &lt;span&gt; element.
 * Each paragraph phrase is unique.   
 */
if (typeof module === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		module.exports = factory(require, exports, module);
	};
}

define(function(require, exports, module) {
	var prefs = require('../assets/preferences');

	var langs = {
		en: {
			common: ['Corp','finance'],
			words: ['proactively','20','24/7','access','action','actualize','adaptive','administrate','after','and','applications','appropriately','architect','architectures','areas','art','authoritatively','b2b','b2c','backend','backward-compatible','base','based','before','benefits','best-of-breed','bricks-and-clicks','business','capital','chains','channels','clicks-and-mortar','client-centered','client-centric','client-focused','collaboration','collaboratively','communicate','communities','compellingly','competencies','competently','competitive','completely','conceptualize','content','continually','conveniently','convergence','coordinate','core','corporate','cost','create','credibly','cross','cross-media','cross-unit','cultivate','customer','customized','cutting-edge','data','deliver','deliverables','deploy','develop','directed','distinctive','distinctively','distributed','diverse','dramatically','dynamically','e-business','e-commerce','e-markets','e-services','e-tailers','effective','efficient','efficiently','embrace','emerging','empower','empowered','enabled','end-to-end','energistically','engage','enthusiastically','envisioned','envisioneer','equity','evisculate','evolve','excellent','experiences','expertise','extensible','extensive','fabricate','focused','for','forward','front-end','fully','functional','future-proof','generate','globally','go','goal-oriented','granular','grow','growth','high','high-payoff','highly','holistic','holistically','holisticly','idea-sharing','ideas','impactful','imperatives','improvements','in','incentivize','inexpensive','infomediaries','information','initiate','initiatives','innovate','innovation','innovative','installed','integrated','intellectual','interactive','interactively','interdependent','interfaces','intermandated','intrinsicly','invested','items','leadership','linkage','magnetic','maintain','maintainable','maintainablea','manufactured','market-driven','markets','materials','maximize','maximizing','mesh','meta-services','methodologies','metrics','mindshare','models','multidisciplinary','multifunctional','multimedia','networks','niche','objectively','of','one-to-one','open-source','opportunities','optimal','orchestrate','orthogonal','out-of-the-box','outside-the-box','outsourcing','paradigms','parallel','partnerships','performance','phosfluorescently','platforms','plug-and-play','pontificate','portals','potentialities','predominate','premier','proactive','procedures','process','process-centric','procrastinate','productize','products','professional','professionally','progressive','progressively','prospective','provide','quality','quickly','rapidiously','rather','re-engineer','real-time','recaptiualize','reinvent','relationships','reliable','repurpose','resource','resource-leveling','resources','restore','results','revolutionary','robust','roi','scale','scenarios','schemas','seamlessly','seize','service','services','simplify','solutions','standardized','standards','state','sticky','strategic','strategies','strategize','sucking','superior','supply','synergistic','synergistically','synergize','synergy','systems','target','task','technology','tested','testing','than','the','theme','thinking','through','timely','to','top-line','total','transform','transition','turnkey','underwhelm','uniquely','unleash','users','utilize','value','value-added','vertical','via','viral','vis-a-vis','visionary','visualize','vortals','web','web-enabled','web-readiness','whereas','whiteboard','wireless','with','without']
		},
		sp: {
			common: ['palabras', 'corporativos'],
			words: ['obtener', 'sus', 'propias', 'palabras']
		},
		ru: {
			common: ['Корпоративные', 'слова'],
			words: ['получить', 'ваши', 'собственные', 'корпоративные', 'слов']
		}
	};

	
	prefs.define('corpem.defaultLang', 'en', 
		'Default language of generated dummy text. Currently, <code>en</code>\
		and <code>ru</code> are supported, but users can add their own syntaxes\
		see <a href="http://docs.emmet.io/abbreviations/corpem-ipsum/">docs</a>.');
	prefs.define('corpem.omitCommonPart', true,
		'Omit commonly used part (e.g. “corpem dolor sit amet“) from generated text.');
	
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
			if (!~result.indexOf(randIx)) {
				result.push(randIx);
			}
		}
		
		return result.map(function(ix) {
			return arr[ix];
		});
	}
	
	function choice(val) {
		if (typeof val === 'string')
			return val.charAt(randint(0, val.length - 1));
		
		return val[randint(0, val.length - 1)];
	}
	
	function sentence(words, end) {
		if (words.length) {
			words[0] = words[0].charAt(0).toUpperCase() + words[0].substring(1);
		}
		
		return words.join(' ') + (end || choice('?!...')); // more dots than question marks
	}
	
	/**
	 * Insert commas at randomly selected words. This function modifies values
	 * inside <code>words</code> array 
	 * @param {Array} words
	 */
	function insertCommas(words) {
		var len = words.length;

		if (len < 2) {
			return;
		}

		var totalCommas = 0;
		if (len > 3 && len <= 6) {
			totalCommas = randint(0, 1);
		} else if (len > 6 && len <= 12) {
			totalCommas = randint(0, 2);
		} else {
			totalCommas = randint(1, 4);
		}

		for (var i = 0, pos, word; i < totalCommas; i++) {
			pos = randint(0, words.length - 2);
			word = words[pos];
			if (word.charAt(word.length - 1) !== ',') {
				words[pos] += ',';
			}
		}
	}
	
	/**
	 * Generate a paragraph of "Corporate babble" text
	 * @param {Number} wordCount Words count in paragraph
	 * @param {Boolean} startWithCommon Should paragraph start with common 
	 * "Corporate babble" sentence.
	 * @returns {String}
	 */
	function paragraph(lang, wordCount, startWithCommon) {
		var data = langs[lang];
		if (!data) {
			return '';
		}

		var result = [];
		var totalWords = 0;
		var words;
		
		wordCount = parseInt(wordCount, 10);
		
		if (startWithCommon && data.common) {
			words = data.common.slice(0, wordCount);
			if (words.length > 5) {
				words[4] += ',';
			}
			totalWords += words.length;
			result.push(sentence(words, '.'));
		}
		
		while (totalWords < wordCount) {
			words = sample(data.words, Math.min(randint(2, 30), wordCount - totalWords));
			totalWords += words.length;
			insertCommas(words);
			result.push(sentence(words));
		}
		
		return result.join(' ');
	}

	return {
		/**
		 * Adds new language words for Corporate babble generator
		 * @param {String} lang Two-letter lang definition
		 * @param {Object} data Words for language. Maight be either a space-separated 
		 * list of words (String), Array of words or object with <code>text</code> and
		 * <code>common</code> properties
		 */
		addLang: function(lang, data) {
			if (typeof data === 'string') {
				data = {
					words: data.split(' ').filter(function(item) {
						return !!item;
					})
				};
			} else if (Array.isArray(data)) {
				data = {words: data};
			}

			langs[lang] = data;
		},
		preprocessor: function(tree) {
			var re = /^(?:corpem)([a-z]{2})?(\d*)$/i, match;
			var allowCommon = !prefs.get('corpem.omitCommonPart');
			
			/** @param {AbbreviationNode} node */
			tree.findAll(function(node) {
				if (node._name && (match = node._name.match(re))) {
					var wordCound = match[2] || 30;
					var lang = match[1] || prefs.get('corpem.defaultLang') || 'en';
					
					// force node name resolving if node should be repeated
					// or contains attributes. In this case, node should be outputed
					// as tag, otherwise as text-only node
					node._name = '';
					node.data('forceNameResolving', node.isRepeating() || node.attributeList().length);
					node.data('pasteOverwrites', true);
					node.data('paste', function(i) {
						return paragraph(lang, wordCound, !i && allowCommon);
					});
				}
			});
		}
	};
});
