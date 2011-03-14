/**
 * Filter for auto-adding "runat" attribute to tags with namespace prefix
 * @author Georgii Dolzhykov (thorn.mailbox@gmail.com)
 */
(function(){

	function process(tree) {
		for (var i = 0, il = tree.children.length; i < il; i++) {
			var item = tree.children[i];
			if (item.type == 'tag' && item.name && item.name.toLowerCase().indexOf(':') != -1 && item.start.toLowerCase().indexOf('runat') == -1)
				item.start = item.start.replace(/>/, ' runat="server">');
			process(item);
		}
	}
	
	zen_coding.registerFilter('asp', process);
})();
