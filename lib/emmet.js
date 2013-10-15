if (typeof module === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		module.exports = factory(require, exports, module);
	};
} else {
	requirejs.config({
		paths: {
			'lodash': '../bower_components/lodash/dist/lodash'
		}
	});
}

define(function (require, exports, module) {
	var _ = require('lodash');
	var range = require('./assets/range');
	var utils = require('./utils/common');
	console.log('Range: ', range.create(1, 2));
	return {};
});