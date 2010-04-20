Dialog = function (Config){
	this.config = Config || {};
	this.objIE = null;
	try{
		this.objIE = new ActiveXObject("InternetExplorer.Application");
		this.objIE.navigate("about:blank");
		this.objIE.AddressBar = false;
		this.objIE.MenuBar = false;
		this.objIE.ToolBar = false;
		this.objIE.StatusBar = false;
		this.objIE.Height = 200;
		this.objIE.Width  = 200;
		this.objIE.Top  = 200;
		while(this.objIE.busy)
		{

		}
		var d = this.objIE.Document;
		d.Dialog = this;
		d.Config = this.config;

		var styles = d.createElement('style');
		styles.setAttribute('type', 'text/css');
		styles.styleSheet.cssText = this.config.css || '\nbody {overflow: auto;}\n';

		var headRef = d.getElementsByTagName('head')[0];
		headRef.appendChild(styles); 
		
		d.body.innerHTML = this.config.html || "";
		d.title = this.config.title || "Dialog";
		
		for(var el in this.config){
			if (!/^(css|html)$/i.test(el) && this.objIE[el]!=undefined){
				this.objIE[el] = this.config[el];
			}
		}
		
		if ('js' in this.config) {
			this.config.js.call(d)
		}
		
	}catch(e){
		debug(e);
		this.objIE.Quit();
		this.objIE = null;
	}
	this.show = function(){
		this.objIE.Visible = true;	
	}
	this.hide = function(){
		this.objIE.Visible = false;	
	}
	this.close = function(){
		this.objIE.Quit();	
	}
}


