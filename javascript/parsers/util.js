/* A few useful utility functions. */

// The value used to signal the end of a sequence in iterators.
var StopIteration = {
	toString : function() {
		return "StopIteration"
	}
};

// Apply a function to each element in a sequence.
function forEach(iter, f) {
	if (iter.next) {
		try {
			while (true)
				f(iter.next());
		} catch (e) {
			if (e != StopIteration)
				throw e;
		}
	} else {
		for (var i = 0; i < iter.length; i++)
			f(iter[i]);
	}
}
