/**
 * Filter for auto-adding "runat" attribute to tags with namespace prefix
 * @author Georgii Dolzhykov (thorn.mailbox@gmail.com)
 */
(function(){

	function process(tree, profile) {
		var attr_quote = profile.attr_quotes == 'single' ? "'" : '"';
		var attr_name = profile.attr_case == 'upper' ? 'RUNAT' : profile.attr_case == 'lower' ? 'runat' : 'RunAt';
		for (var i = 0, il = tree.children.length; i < il; i++) {
			var item = tree.children[i];
			if (item.type == 'tag' && item.name && item.name.indexOf(':') != -1 && !/\srunat\b/i.test(item.start))
				item.start = item.start.replace(/(\/)?>/, ' ' + attr_name + '=' + attr_quote + 'server' + attr_quote + '$1>');
			process(item, profile);
		}
	}

	zen_coding.registerFilter('asp', process);
})();
