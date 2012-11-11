/**
 * <code>IEmmetFile</code> implementation for Komodo Edit
 * @param {Function} require
 * @param {Underscore} _
 */
emmet.define('file', function(require, _) {
	
	function startsWith(str, chars) {
		return str.indexOf(chars) === 0;
	}
	
	return {
		/**
		 * Read file content and return it
		 * @param {String} path File's relative or absolute path
		 * @return {String}
		 */
		read: function(path) {
			var fileIn = FileIO.open(path);
			if (fileIn.exists()) {
				return FileIO.readBinary(fileIn);
			}
		},
		
		/**
		 * Locate <code>file_name</code> file that relates to <code>editor_file</code>.
		 * File name may be absolute or relative path
		 * 
		 * <b>Dealing with absolute path.</b>
		 * Many modern editors have a "project" support as information unit, but you
		 * should not rely on project path to find file with absolute path. First,
		 * it requires user to create a project before using this method (and this 
		 * is not very convenient). Second, project path doesn't always points to
		 * to website's document root folder: it may point, for example, to an 
		 * upper folder which contains server-side scripts.
		 * 
		 * For better result, you should use the following algorithm in locating
		 * absolute resources:
		 * 1) Get parent folder for <code>editorFile</code> as a start point
		 * 2) Append required <code>fileName</code> to start point and test if
		 * file exists
		 * 3) If it doesn't exists, move start point one level up (to parent folder)
		 * and repeat step 2.
		 * 
		 * @param {String} editorFile
		 * @param {String} fileName
		 * @return {String} Returns null if <code>fileName</code> cannot be located
		 */
		locateFile: function(editorFile, fileName) {
			var f = FileIO.open(editorFile), tmp;
				
			// traverse upwards to find file uri
			while (f = f.parent) {
				tmp = FileIO.open(this.createPath(f.path, fileName));
				if (tmp.exists()) {
					return tmp.path;
				}
			}
			
			return null;
		},
		
		/**
		 * Creates absolute path by concatenating <code>parent</code> and <code>file_name</code>.
		 * If <code>parent</code> points to file, its parent directory is used
		 * @param {String} dirname
		 * @param {String} file
		 * @return {String}
		 */
		createPath: function(dirname, file) {
			if (file.charAt(0) == '/') // absolute path
				return file;
			
			// make sure that dirname is url
			var f = FileIO.open(dirname);
			dirname = FileIO.path(f.isDirectory() ? f : f.parent);
			
			if (dirname.charAt(dirname.length - 1) != '/')
				dirname += '/';
				
			var path = dirname + file;
			var protocol = '';
			// temporary remove protocol, if exists
			path = path.replace(/^([a-z]+\:\/\/)\/*/i, function(str, p1) {
				protocol = p1;
				return '/';
			});
			
			// took from Python
			var initial_slashes = startsWith(path, '/');
//			POSIX allows one or two initial slashes, but treats three or more
//			as single slash.
			if (initial_slashes && startsWith(path, '//') && !startsWith(path, '///'))
				initial_slashes = 2;
				
			var comps = path.split('/');
			var new_comps = [];
				
			for (var i = 0, il = comps.length; i < il; i++) {
				var comp = comps[i];
				if (comp == '' || comp == '.')
					continue;
					
				if (comp != '..' || (!initial_slashes && !new_comps.length) || 
					(new_comps.length && new_comps[new_comps.length - 1] == '..'))
					new_comps.push(comp);
				else if (new_comps.length)
					new_comps.pop();
					
			}
			
			comps = new_comps;
			path = comps.join('/');
			if (initial_slashes) {
				var prefix = '';
				do {
					prefix += '/';
				} while (--initial_slashes);
				
				path = prefix + path;
			}
			
			return (protocol + path) || '.';
		},
		
		/**
		 * Saves <code>content</code> as <code>file</code>
		 * @param {String} file File's absolute path
		 * @param {String} content File content
		 */
		save: function(file, content) {
			var fileOut = FileIO.open(file);
			FileIO.write(fileOut, content);
		},
		
		/**
		 * Returns file extension in lower case
		 * @param {String} file
		 * @return {String}
		 */
		getExt: function(file) {
			var m = (file || '').match(/\.([\w\-]+)$/);
			return m ? m[1].toLowerCase() : '';
		}
	};
});