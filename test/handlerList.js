var assert = require('assert');
var handlerList = require('../lib/assets/handlerList');

describe('Handler List', function() {
	var hl = handlerList.create();
	var execOrder = [];

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

	it('should run actions in exact order', function() {
		assert.equal(hl.list().length, 3, 'Added 3 handlers');
	
		assert.ok(!hl.exec(null), 'No handler executed successfully');
		assert.deepEqual(execOrder, ['b', 'c', 'a'], 'Handlers executed in correct order');
		
		execOrder.length = 0;
		var fn = function() {
			execOrder.push('d');
			return true;
		};
		
		hl.add(fn, {order: 2});
		
		assert.ok(hl.exec(null), 'One handler executed successfully');
		assert.deepEqual(execOrder, ['b', 'd'], 'Handlers executed in correct order');
		
		hl.remove(fn);
		
		assert.equal(hl.list().length, 3, 'Handler successfully removed');
	});
});
