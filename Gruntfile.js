module.exports = function(grunt) {
	var fs = require('fs');
	var path = require('path');
	var ciu = require('./lib/assets/caniuse');

	function getOptimizedCIU(file) {
		var content = readFile(file);
		return JSON.stringify(ciu.optimize(content));
	}

	function readFile(name) {
		return fs.readFileSync(name, {encoding: 'utf8'});
	}

	var rjsStart = '(function (root, factory) {' +
		'if (typeof define === \'function\' && define.amd) {' +
		'define(factory);' +
		'} else {' + 
		'root.emmet = factory();' +
		'}' +
		'}(this, function () {';

	var rjsEnd = 'var _emmet = require("emmet");' +
		'_emmet.require = require;' + 
		'_emmet.define = define;' + 
		'return _emmet;}));';

	var rjsSnippets = 'var resources = require("assets/resources");' +
		'resources.setVocabulary(' + readFile('./lib/snippets.json') + ', "system");';

	var rjsCanIUse = 'var caniuse = require("assets/caniuse");' +
		'caniuse.load(' + getOptimizedCIU('./lib/caniuse.json') + ', true);';

	var rjsOpt = {
		baseUrl: './lib',
		paths: {
			lodash: '../node_modules/lodash/lodash'
		},
		rawText: {
			'fs': 'define({});',
			'path': 'define({});'
		},
		include: ['./emmet'],
		name: 'vendor/almond',
		optimize: 'none',
		out: './dist/emmet.js',
		wrap: {
			start: rjsStart,
			end: rjsEnd
		}
	};

	function merge(obj) {
		var args = Array.prototype.slice.call(arguments, 1), c;
		while (c = args.shift()) {
			Object.keys(c).forEach(function(k) {
				obj[k] = c[k];
			});
		}
		
		return obj;
	}

	function rjsConfig(opt) {
		return {options: merge({}, rjsOpt, opt)};
	}

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		requirejs: {
			// "App" version of Emmet: does not include snippets.json and caniuse.json,
			// assuming that it should be loaded by app controller 
			app: rjsConfig({out: './dist/emmet-app.js',}),

			// "Full" version of Emmet: ad-hoc bundle, mostly used by
			// browser plugins simply by including single <script> tag
			// with full Emmet version (minified version is also available)
			full: rjsConfig({
				wrap: {
					start: rjsStart,
					end: rjsSnippets + rjsCanIUse + rjsEnd
				}
			})
		},
		uglify: {
			full: {
				src: ['./dist/emmet.js'],
				dest: './dist/emmet-min.js'
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-requirejs');

	grunt.registerTask('app', ['requirejs:app']);
	grunt.registerTask('full', ['requirejs:full', 'uglify:full']);
	grunt.registerTask('default', ['app', 'full']);
};