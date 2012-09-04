/**
 * Implementation of @{link IEmmetFile} interface
 * See `javascript/interfaces/IEmmetFile.js`
 * @param {Function} require
 * @param {Underscore} _
 * @memberOf __nppPluginFile
 * @constructor
 */
emmet.define('file', function(require, _) {
	var backward = {
		'C7': '80',
		'FC': '81',
		'E9': '82',
		'E2': '83',
		'E4': '84',
		'E0': '85',
		'E5': '86',
		'E7': '87',
		'EA': '88',
		'EB': '89',
		'E8': '8A',
		'EF': '8B',
		'EE': '8C',
		'EC': '8D',
		'C4': '8E',
		'C5': '8F',
		'C9': '90',
		'E6': '91',
		'C6': '92',
		'F4': '93',
		'F6': '94',
		'F2': '95',
		'FB': '96',
		'F9': '97',
		'FF': '98',
		'D6': '99',
		'DC': '9A',
		'A2': '9B',
		'A3': '9C',
		'A5': '9D',
		'20A7': '9E',
		'192': '9F',
		'E1': 'A0',
		'ED': 'A1',
		'F3': 'A2',
		'FA': 'A3',
		'F1': 'A4',
		'D1': 'A5',
		'AA': 'A6',
		'BA': 'A7',
		'BF': 'A8',
		'2310': 'A9',
		'AC': 'AA',
		'BD': 'AB',
		'BC': 'AC',
		'A1': 'AD',
		'AB': 'AE',
		'BB': 'AF',
		'2591': 'B0',
		'2592': 'B1',
		'2593': 'B2',
		'2502': 'B3',
		'2524': 'B4',
		'2561': 'B5',
		'2562': 'B6',
		'2556': 'B7',
		'2555': 'B8',
		'2563': 'B9',
		'2551': 'BA',
		'2557': 'BB',
		'255D': 'BC',
		'255C': 'BD',
		'255B': 'BE',
		'2510': 'BF',
		'2514': 'C0',
		'2534': 'C1',
		'252C': 'C2',
		'251C': 'C3',
		'2500': 'C4',
		'253C': 'C5',
		'255E': 'C6',
		'255F': 'C7',
		'255A': 'C8',
		'2554': 'C9',
		'2569': 'CA',
		'2566': 'CB',
		'2560': 'CC',
		'2550': 'CD',
		'256C': 'CE',
		'2567': 'CF',
		'2568': 'D0',
		'2564': 'D1',
		'2565': 'D2',
		'2559': 'D3',
		'2558': 'D4',
		'2552': 'D5',
		'2553': 'D6',
		'256B': 'D7',
		'256A': 'D8',
		'2518': 'D9',
		'250C': 'DA',
		'2588': 'DB',
		'2584': 'DC',
		'258C': 'DD',
		'2590': 'DE',
		'2580': 'DF',
		'3B1': 'E0',
		'DF': 'E1',
		'393': 'E2',
		'3C0': 'E3',
		'3A3': 'E4',
		'3C3': 'E5',
		'B5': 'E6',
		'3C4': 'E7',
		'3A6': 'E8',
		'398': 'E9',
		'3A9': 'EA',
		'3B4': 'EB',
		'221E': 'EC',
		'3C6': 'ED',
		'3B5': 'EE',
		'2229': 'EF',
		'2261': 'F0',
		'B1': 'F1',
		'2265': 'F2',
		'2264': 'F3',
		'2320': 'F4',
		'2321': 'F5',
		'F7': 'F6',
		'2248': 'F7',
		'B0': 'F8',
		'2219': 'F9',
		'B7': 'FA',
		'221A': 'FB',
		'207F': 'FC',
		'B2': 'FD',
		'25A0': 'FE',
		'A0': 'FF'
	};
	
	var hD = "0123456789ABCDEF";

	function d2h(d) {
		var h = hD.substr(d & 15, 1);
		while (d > 15) {
			d >>>= 4;
			h = hD.substr(d & 15, 1) + h;
		}
		
		return h;
	}

	function h2d(h) {
		return parseInt(h, 16);
	}

	function _readFile(path) {
		var bs = new ActiveXObject("ADODB.Stream");
		bs.Type = 2;
		bs.CharSet = '437';
		bs.Open();
		bs.LoadFromFile(path);
		
		var what = bs.ReadText;
		bs.Close();
		return what;
	}

	return {
		read: function(path) {
			var content = _readFile(path);
			
			// encode result
			var encArray = [];
			for (var i = 0, sL = content.length; i < sL; i++) {
				var cc = content.charCodeAt(i);
				if (cc >= 128) {
					cc = h2d(backward['' + d2h(cc)]);
				}
				encArray.push(String.fromCharCode(cc));
			}
			
			return encArray.join('') || '';
		},
		
		locateFile: function(baseFile, fileName) {
			var fso = new ActiveXObject("Scripting.FileSystemObject");
			var parent = baseFile, tmp;
			
			while (parent = fso.GetParentFolderName(parent)) {
				tmp = this.createPath(parent, fileName);
				if (fso.FileExists(tmp)) {
					return fso.GetAbsolutePathName(tmp);
				}
			}
			
			return '';
		},
		
		createPath: function(parent, fileName) {
			var fso = new ActiveXObject("Scripting.FileSystemObject");
			return fso.BuildPath(parent, fileName);
		},
		
		save: function(file, content) {
			var fso = new ActiveXObject("Scripting.FileSystemObject");
			var f = null;
			
			try {
				f = fso.OpenTextFile(file, 2, true, 0);
				f.Write(content);
			} catch(e){
				debug(e);
			}
			
			if (f)
				f.Close();
		},
		
		getExt: function(file) {
			var m = (file || '').match(/\.([\w\-]+)$/);
			return m ? m[1].toLowerCase() : '';
		}
	};
});