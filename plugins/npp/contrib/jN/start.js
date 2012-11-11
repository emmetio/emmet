/**
 *	Please place your code in *.js files in includes folder
 */

/**

 	Use GlobalListener.addListener(yoursCfg); to add new event listener
	and  GlobalListener.removeListener(yoursCfg); to remove your event listener

	For example
	GlobalListener.addListener({
		// you can place in this config object any your data and methods, not event handler only
		myTextField : "tru ta ta la la la",
		myOwnMethod:function(eventname){
			var v = Editor.currentView;
			Editor.alert(eventname + '\n' + v.files[v.file]);
		},
		
		SHUTDOWN:function(){
			//this.myOwnMethod("shutdown");
		},
		BUFFERACTIVATED:function(v,pos){
			var files = v.files;
			this.myOwnMethod("bufferactivated "+files[pos]);
		},
		READONLYCHANGED:function(v,pos){
			this.myOwnMethod("readonly "+pos);
		},
		LANGCHANGED:function(v,pos){
			this.myOwnMethod("langchanged "+pos);
		},
		FILECLOSED:function(){
			//this.myOwnMethod("FILECLOSED");
		},
		FILEOPENED:function(v,pos){
			this.myOwnMethod("FILEOPENED "+ pos);
		},		
		FILESAVED:function(v,pos){
			this.myOwnMethod("FILESAVED "+pos);
		},
		CHARADDED:function(v, pos){
			//alert(v.selection);
		},
		DOUBLECLICK:function(v, pos){
			if (v.selection.length > 2){
				MenuCmds.SEARCH_UNMARKALLEXT1();
				MenuCmds.SEARCH_MARKALLEXT1();
			}
		}
	});
*/

/**
	calls fn for each el in an Array. Returns an new array of results of fn calls
	XXX: had to make this function closer to ECMA-262 5th spec since original
	implementation breaks compatibility for Underscore library
*/
if (!Array.prototype.forEach) {
	Array.prototype.forEach = function(fn, scope) {
		var result = [];
		for (var i = 0, len = this.length; i < len; ++i) {
			result.push(fn.call(scope || this, this[i], i, this));
		}

		return result;
	};
}
/**
 * returns index of el in an Array, otherwise -1
 * XXX ECMA-262 implemetation
 */
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement /*, fromIndex */ ) {
        "use strict";
        if (this == null) {
            throw new TypeError();
        }
        var t = Object(this);
        var len = t.length >>> 0;
        if (len === 0) {
            return -1;
        }
        var n = 0;
        if (arguments.length > 0) {
            n = Number(arguments[1]);
            if (n != n) { // shortcut for verifying if it's NaN
                n = 0;
            } else if (n != 0 && n != Infinity && n != -Infinity) {
                n = (n > 0 || -1) * Math.floor(Math.abs(n));
            }
        }
        if (n >= len) {
            return -1;
        }
        var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
        for (; k < len; k++) {
            if (k in t && t[k] === searchElement) {
                return k;
            }
        }
        return -1;
    };
}

/**
	for internal use
*/
function debug(e){
	Editor.alert(stringifyException(e));
}
/**
	for internal use
*/
function stringifyException(e){
	var result="";
	for(var i in e)
		result+=i+"="+e[i]+"\r\n";
		
	return result;
}

/**
	for internal use only, see GlobalListener
*/
function Listener(eventNames){
	var handler = {};
	var self = this;
	
	var handle = function(evN, args){
		var evHs = handler[evN];
		if (evHs)
			for (var i=0,c=evHs.length; i<c; i++)
				try{
					evHs[i][evN].apply(evHs[i], args);
				}catch(e){
					debug(e);
				}
	};
	
	eventNames.forEach(function(evN){
		// create for each event an array of handlers
		handler[evN] = [];
		// create for each event an function with the same name
		self[evN] = function(n){return function(){handle(n,arguments);};}(evN);
	});
	
	this.addListener = function(l){
		for(var evN in handler){
			if (l[evN]){
				if (handler[evN].indexOf(l)==-1)
					handler[evN].push(l);
			}
		}
	};
};
/**
	Is an Interface for Setting and Reading of Settings
	get(name);
	set(name,valueStr);
*/
function Settings(file){
	var settings = null;
	var reg = /\"/g;
	var direct = function(v){return v;};
	var conv = {
		"boolean"	: direct,
		"string"	: function(str){	return  '"'+str.replace(reg, '\\"')+'"';},
		"number" 	:direct,
		"object" 	:function(obj){
						var r = "", comma = "";
						for(var el in obj){
							r+= comma+unk2str(el)+':'+unk2str(obj[el]);
							comma = ",";
						}
						return  "{"+r+"}";
					},
		"array"		:function(arr){ 
						var r="",comma="";
						for(var i=0, c=arr.length; i<c; i++){
							r+= comma+unk2str(arr[i]);
							comma = ",";
						}
						return "["+r+"]";
					},
		"undefined"	:direct,
		"function"	:direct
	};
	var unk2str = function(unk){
		var type = typeof(unk);
		return conv[(type == "object" && unk.join) ?"array":type](unk);
	};
	
	
	var save = function(){
		var fso = new ActiveXObject("Scripting.FileSystemObject");
		var f,e;
		try{
			f = fso.OpenTextFile(file,2, true,-1); // for writing ASCII
			f.Write(unk2str(settings));
		}catch(e){
			debug(e);
		}
		if (f)
			f.Close();
	};
	
	this.get = function(name){
		var fso = new ActiveXObject("Scripting.FileSystemObject");
		if (settings == null){ // try to read
			if (fso.FileExists(file)){

				var f = fso.OpenTextFile(file,1, false,-1);  // for reading Unicode
				if (!f.AtEndOfStream){
					try{
						var scr = f.ReadAll();
						if (scr && scr.length>0){
								if (scr.charCodeAt(0)==65279) 	// is UTF-8 with BOM
									scr[0] = ' ';				// replace BOM with space symbol
								settings = eval("("+scr+")");
						}
					}catch(e){
						debug(e);
					}
				}
				f.Close();
			}
		}

		return settings? settings[name] : null;
	};
	
	this.set = function(name, valueStr){
		var result = this.get(name);

		if (!settings)
			settings = {};
		
		settings[name] = valueStr;
		save();
		
		return result;
	};
};

GlobalSettings = new Settings(Editor.nppDir+"\\Plugins\\jN\\settings.js");

// initialize Listener with known event names
GlobalListener = new Listener(['SHUTDOWN','READONLYCHANGED','LANGCHANGED','BUFFERACTIVATED','FILESAVED','FILECLOSED','FILEOPENED','CHARADDED','DOUBLECLICK','CLICK','UPDATEUI']);
Editor.setListener(GlobalListener);

var loadIdleHandler = {
	fso : new ActiveXObject("Scripting.FileSystemObject"),
	errors : [],
	/** 
		Reads and runs your JavaScript file.
		Use UTF-8 or UTF-8 with BOM for new include files!
	*/
	include : function (file){
		if (this.fso.FileExists(file)){
			var f = this.fso.OpenTextFile(file,1, false,0);
			var scr = decodeFrom(65001,f.ReadAll());
			if (scr && scr.length>0){
				try{
					if (scr.charCodeAt(0)==65279) 	// is UTF-8 with BOM
						scr[0] = ' ';				// replace BOM with space symbol
					addScript(scr);//eval(scr);
				}catch(e){
					this.errors.push(e);
				}
			}
			f.Close();
		}
	},	
	cmd:function(){
		var includeDir = Editor.nppDir+"\\Plugins\\jN\\includes";
		var incDirObj = this.fso.GetFolder(includeDir);
		if (incDirObj){
			var filesEnum = new Enumerator(incDirObj.files);
			for (; !filesEnum.atEnd(); filesEnum.moveNext()){
				var file = filesEnum.item().Path;
				if (/\.js$/i.test(file)){
					this.include(file);
				}
			}
		}
	},
	millis:1000
}
//loadIdleHandler.cmd();
//Editor.addIdleHandler(loadIdleHandler);
setTimeout(loadIdleHandler);