/**
 * @memberOf __zen_filter_bem
 * @constructor
 */
zen_coding.registerFilter('bem', (function() {
	var separators = {
		element: '__',
		modifier: '_'
	};
	
	var toString = Object.prototype.toString;
	var isArray = Array.isArray || function(obj) {
		return toString.call(obj) == '[object Array]';
	};
	
	var shouldRunHtmlFilter = false;
	
	/**
	 * @param {ZenNode} item
	 */
	function bemParse(item) {
		if (item.type != 'tag')
			return item;
		
		// save BEM stuff in cache for faster lookups
		item.__bem = {
			block: '',
			element: '',
			modifier: ''
		};
		
		var classNames = normalizeClassName(item.getAttribute('class')).split(' ');
		
		// process class names
		var processedClassNames = [];
		var i, il, _item;
		for (i = 0, il = classNames.length; i < il; i++) {
			processedClassNames.push(processClassName(classNames[i], item));
		}
		
		// flatten array
		var allClassNames = [];
		for (i = 0, il = processedClassNames.length; i < il; i++) {
			_item = processedClassNames[i];
			if (isArray(_item)) {
				for (var j = 0, jl = _item.length; j < jl; j++) {
					allClassNames.push(_item[j]);
				}
			} else {
				allClassNames.push(_item);
			}
		}
		
		// remove duplicates
		var memo = [];
		for (i = 0, il = allClassNames.length; i < il; i++) {
			_item = allClassNames[i];
			if (!arrayInclude(memo, _item))
				memo.push(_item);
		}
		
		allClassNames = memo;
		item.setAttribute('class', allClassNames.join(' '));
		
		if (!item.__bem.block) {
			// guess best match for block name
			var reBlockName = /^[a-z]\-/i;
			for (i = 0, il = allClassNames.length; i < il; i++) {
				/** @type String */
				if (reBlockName.test(allClassNames[i])) {
					item.__bem.block = allClassNames[i];
					break;
				}
			}
			
			// guessing doesn't worked, pick first class name as block name
			if (!item.__bem.block) {
				item.__bem.block = allClassNames[0];
			}
			
		}
		
		return item;
	
	}
	
	/**
	 * @param {String} className
	 * @returns {String}
	 */
	function normalizeClassName(className) {
		return (className || '').replace(/\s+/g, ' ').replace(/^\-+/g, function(str) {
			return zen_coding.repeatString(separators.element, str.length);
		});
	}
	
	/**
	 * Processes class name
	 * @param {String} name Class name item to process
	 * @param {ZenNode} item Host node for provided class name
	 * @returns {String} Processed class name. May return <code>Array</code> of
	 * class names 
	 */
	function processClassName(name, item) {
		name = transformClassName(name, item, 'element');
		name = transformClassName(name, item, 'modifier');
		
		// expand class name
		// possible values:
		// * block__element
		// * block__element_modifier
		// * block__element_modifier1_modifier2
		// * block_modifier
		var result, block = '', element = '', modifier = '';
		if (~name.indexOf(separators.element)) {
			var blockElem = name.split(separators.element);
			var elemModifiers = blockElem[1].split(separators.modifier);
			
			block = blockElem[0];
			element = elemModifiers.shift();
			modifier = elemModifiers.join(separators.modifier);
		} else if (~name.indexOf(separators.modifier)) {
			var blockModifiers = name.split(separators.modifier);
			
			block = blockModifiers.shift();
			modifier = blockModifiers.join(separators.modifier);
		}
		
		if (block) {
			// inherit parent bem element, if exists
			if (item.parent && item.parent.__bem && item.parent.__bem.element)
				element = item.parent.__bem.element + separators.element + element;
			
			// produce multiple classes
			var prefix = block;
			var result = [];
			
			if (element) {
				prefix += separators.element + element;
				result.push(prefix);
			} else {
				result.push(prefix);
			}
			
			if (modifier) {
				result.push(prefix + separators.modifier + modifier);
			}
			
			
			item.__bem.block = block;
			item.__bem.element = element;
			item.__bem.modifier = modifier;
			
			return result;
		}
		
		// ...otherwise, return processed or original class name
		return name;
	}
	
	/**
	 * Low-level function to transform user-typed class name into full BEM class
	 * @param {String} name Class name item to process
	 * @param {ZenNode} item Host node for provided class name
	 * @param {String} entityType Type of entity to be tried to transform 
	 * ('element' or 'modifier')
	 * @returns {String} Processed class name or original one if it can't be
	 * transformed
	 */
	function transformClassName(name, item, entityType) {
		var reSep = new RegExp('^(' + separators[entityType] + ')+', 'g');
		if (reSep.test(name)) {
			var depth = 0; // parent lookup depth
			var cleanName = name.replace(reSep, function(str, p1) {
				depth = str.length / separators[entityType].length;
				return '';
			});
			
			// find donor element
			var donor = item;
			if (!donor.__bem.block)
				while (donor.parent && depth--) {
					donor = donor.parent;
				}
			
			if (donor && donor.__bem) {
				var prefix = donor.__bem.block;
				if (entityType == 'modifier' &&  donor.__bem.element)
					prefix += separators.element + donor.__bem.element;
				
				return prefix + separators[entityType] + cleanName;
			}
		}
		
		return name;
	}
	
	/**
	 * Utility function, checks if <code>arr</code> contains <code>value</code>
	 * @param {Array} arr
	 * @param {Object} value
	 * @returns {Boolean}
	 */
	function arrayInclude(arr, value) {
		var result = -1;
		if (arr.indexOf) {
			result = arr.indexOf(value);
		} else {
			for (var i = 0, il = arr.length; i < il; i++) {
				if (arr[i] === value) {
					result = i;
					break;
				}
			}
		}
		
		return result != -1;
	}
	
	/**
	 * Recursive function for processing tags, which extends class names 
	 * according to BEM specs: http://bem.github.com/bem-method/pages/beginning/beginning.ru.html
	 * <br><br>
	 * It does several things:<br>
	 * <ul>
	 * <li>Expands complex class name (according to BEM symbol semantics):
	 * .block__elem_modifier → .block.block__elem.block__elem_modifier
	 * </li>
	 * <li>Inherits block name on child elements: 
	 * .b-block > .__el > .__el → .b-block > .b-block__el > .b-block__el__el
	 * </li>
	 * <li>Treats typographic '—' symbol as '__'</li>
	 * <li>Double underscore (or typographic '–') is also treated as an element 
	 * level lookup, e.g. ____el will search for element definition in parent’s 
	 * parent element:
	 * .b-block > .__el1 > .____el2 → .b-block > .b-block__el1 > .b-block__el2
	 * </li>
	 * </ul>
	 * 
	 * @param {ZenNode} tree
	 * @param {Object} profile
	 * @param {Number} [level] Depth level
	 */
	function process(tree, profile, level) {
		for (var i = 0, il = tree.children.length; i < il; i++) {
			var item = tree.children[i];
			process(bemParse(item), profile);
			if (item.type == 'tag' && item.start)
				shouldRunHtmlFilter = true;
		}
		
		return tree;
	};
	
	/**
	 * @param {ZenNode} tree
	 * @param {Object} profile
	 * @param {Number} [level] Depth level
	 */
	return function(tree, profile, level) {
		shouldRunHtmlFilter = false;
		tree = process(tree, profile, level);
		// in case 'bem' filter is applied after 'html' filter: run it again
		// to update output
		if (shouldRunHtmlFilter) {
			tree = zen_coding.runFilters(tree, profile, 'html');
		}
		
		return tree;
	};
})());