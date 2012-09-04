module('Handler List');
test('Check internals', function() {
	var execOrder = [];
	
	/** @type HandlerList */
	var hl = emmet.require('handlerList').create();
	
	hl.add(function() {
		execOrder.push('a');
		return null;
	});
	
	hl.add(function() {
		execOrder.push('b');
		return null;
	}, {order: 3});
	
	hl.add(function() {
		execOrder.push('c');
		return null;
	});
	
	equal(hl.list().length, 3, 'Added 3 handlers');
	
	ok(!hl.exec(null), 'No handler executed successfully');
	deepEqual(execOrder, ['b', 'c', 'a'], 'Handlers executed in correct order');
	
	execOrder.length = 0;
	var fn = function() {
		execOrder.push('d');
		return true;
	};
	
	hl.add(fn, {order: 2});
	
	ok(hl.exec(null), 'One handler executed successfully');
	deepEqual(execOrder, ['b', 'd'], 'Handlers executed in correct order');
	
	hl.remove(fn);
	
	equal(hl.list().length, 3, 'Hand;er successfully removed');
});