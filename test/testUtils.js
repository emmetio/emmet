/**
 * Some utility functions for testing purposes
 */
var path = require('path');
var fs = require('fs');

function isAbsolute(filePath) {
	return filePath.charAt(0) == '/';
}

module.exports = {
	/**
	 * Returns list of absolute paths of CSS and preprocessors files
	 * @param  {String} dir Path directory. Relative paths are resolved 
	 * against main `test` folder
	 * @param {String} ext Extension of preprocessor file, for example, `less`
	 * @return {Array}
	 */
	getFileSet: function(dir, ext) {
		if (!isAbsolute(dir)) {
			dir = path.join(__dirname, dir);
		}
		dir = path.normalize(dir);

		var dirList = fs.readdirSync(dir);
		var reCSS = /\.css$/;
		var rePreproc = new RegExp('\\.' + ext + '$');

		var cssFiles = {};
		var preprocFiles = dirList.filter(function(file) {
			if (reCSS.test(file)) {
				cssFiles[file] = true;
			}
			return rePreproc.test(file);
		});

		return preprocFiles.map(function(file) {
			var css = file.replace(rePreproc, '.css');
			if (!cssFiles[css]) {
				throw new Error('Unable to find CSS for ' + files);
			}

			return {
				preprocessor: path.join(dir, file),
				css: path.join(dir, css)
			};
		});
	},

	readFile: function(f) {
		if (!isAbsolute(f)) {
			f = path.join(__dirname, f);
		}

		return fs.readFileSync(f, {encoding: 'utf8'});
	}
}