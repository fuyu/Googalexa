//"use strict";

if ("undefined" == typeof(Googalexa)) {
  var Googalexa = {};
};

Googalexa = {

	cache : [],
	
	currentMenuStatus : false,
	currentAjaxRequestGoogle : null,
	currentAjaxRequestAlexa : null,
	
	pageLoaded : function(host) {
		// Components.utils.reportError('set stats for: ' + host);
		// Firebug.Console.log('set stats for: ' + host);
		
		this.showPageStats(host);
		this.toggleReloadMenuOption(1);
	},

	
	showPageStats : function(host) {
		var rank = this.getRanksFromCache(host);
		var skipGoogle = false;
		var skipAlexa = false;
		
		this.makeRankBoxVisible();
			
		if (this.currentAjaxRequestGoogle) {
			if (this.currentAjaxRequestGoogle.host != host) {
				this.currentAjaxRequestGoogle.abort();
				this.currentAjaxRequestGoogle = null;
			} else {
				skipGoogle = true;
			}
		}
		
		if (this.currentAjaxRequestAlexa) {
			if (this.currentAjaxRequestAlexa.host != host) {
				this.currentAjaxRequestAlexa.abort();
				this.currentAjaxRequestAlexa = null;
			} else {
				skipAlexa = true;
			}
		}
		
		if (rank) {
			if (rank.g === null) {
				if (!skipGoogle) this.getGoogleRank(host);
			} else if (rank.g != -1) {
				this.setGoogleRank(rank.g);
			} else {
				this.makeGoogleRankNA();
			}
			
			if (rank.a === null) {
				if (!skipAlexa) this.getAlexaRank(host);
			} else if (rank.a != -1) {
				this.setAlexaRank(rank.a);
			} else {
				this.makeAlexaRankNA();
			}
		} else {
			//this.cache.push({"host": host, "g": -1, "a": -1});
			this.cache.push({"host": host, "g": null, "a": null});
			
			this.getGoogleRank(host);
			this.getAlexaRank(host);
		}
		
		//Firebug.Console.log(this.cache);
	},
	
	reload : function() {
		var host = gBrowser.selectedBrowser.currentURI.host;
		this.makeRankBoxVisible();
		this.getGoogleRank(host);
		this.getAlexaRank(host);
	},
	
	getGoogleRank : function(host) {
		var checksum = this.googleSiteChecksum(host);
		var url = "http://toolbarqueries.google.com/tbr?client=navclient-auto&ch=8" + checksum + "&features=Rank&q=info:" + host;
		var rank;
		var request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
		
		request.onloadstart = function() {
			Googalexa.makeGoogleRankLoading();
		};
		request.onload = function(aEvent) {
			var rt = aEvent.target.responseText,
				status = aEvent.target.status;
			
			Googalexa.currentAjaxRequestGoogle = null;
			
			if (!rt || status != 200) {
				Googalexa.makeGoogleRankNA();
				Googalexa.addGoogleRankToCache(host, -1);
				return;
			}
			
			//rank = trim(rt.split(':')[2]);
			rank = rt.split(':')[2].trim();
			
			Googalexa.setGoogleRank(rank);
			Googalexa.addGoogleRankToCache(host, rank);
			
			//Firebug.Console.log(this.cache);
		};  
		request.onerror = function(aEvent) {
			Googalexa.makeGoogleRankNA();
		};
		request.host = host;
		
		this.currentAjaxRequestGoogle = request;
	
		request.open("GET", url, true);  
		request.send(null);
		
		//Firebug.Console.log(request);
	},
	
	getAlexaRank : function(host) {
		var url = 'http://xml.alexa.com/data?cli=10&dat=nsa&url=' + host,
			request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest),
			rank;
		
		request.onloadstart = function() {
			Googalexa.makeAlexaRankLoading();
		};
		request.onload = function(aEvent) {
			var responseXML = aEvent.target.responseXML;
			var rootElement = responseXML.documentElement;
			
			Googalexa.currentAjaxRequestAlexa = null;
			
			if (rootElement && "parseerror" != rootElement.tagName) {
				var popularityTag = rootElement.getElementsByTagName('POPULARITY')[0];
				
				if (!popularityTag) {
					Googalexa.makeAlexaRankNA();
					Googalexa.addAlexaRankToCache(host, -1);
					return;
				}
				
				rank = popularityTag.getAttribute('TEXT');
				
				Googalexa.setAlexaRank(rank);
				Googalexa.addAlexaRankToCache(host, rank);
			}
		};  
		request.onerror = function(aEvent) {  
			Googalexa.makeAlexaRankNA();
		};
		request.host = host;
		
		this.currentAjaxRequestAlexa = request;
		
		request.open("GET", url, true);
		request.send(null);
	},
	
	setGoogleRank : function(rank) {
		var label = document.getElementById('googalexa-google-rank-label'),
			menuitem1 = document.getElementById('googalexa-menuitem-google-1'),
			menuitem2 = document.getElementById('googalexa-menuitem-google-2'),
			prefs = Components.classes["@mozilla.org/preferences-service;1"].
				getService(Components.interfaces.nsIPrefService).
				getBranch("extensions.googalexa.");

		var labelStyle = prefs.getCharPref('googleLabelStyle');

		if (rank == 10) {
			label.removeAttribute('value');
			this.addClass(label, 'googalexa-rank-bg-google-transparent');
		
			var img = document.getElementById('googalexa-google-rank-status-img');
			// img.className =  'googalexa-rank-star';
			img.setAttribute('class', 'googalexa-rank-star');
		} else {
			this.removeClass(label, 'googalexa-rank-bg-google-transparent');
			//label.value = rank;
			label.setAttribute('value', rank);
		}

		label.setAttribute('style', labelStyle);
		
		menuitem1.setAttribute('label', 'Google: ' + rank + '/10');
		menuitem2.setAttribute('label', 'Google: ' + rank + '/10');
	},
	
	setAlexaRank : function(rank) {
		var label = document.getElementById('googalexa-alexa-rank-label'),
			menuitem1 = document.getElementById('googalexa-menuitem-alexa-1'),
			menuitem2 = document.getElementById('googalexa-menuitem-alexa-2'),
			prefs = Components.classes["@mozilla.org/preferences-service;1"].
				getService(Components.interfaces.nsIPrefService).
				getBranch("extensions.googalexa."),
			rankLabel, rankMenu;
		
		var formatNumbers = prefs.getBoolPref('formatNumbers');
		var roundThousands = prefs.getBoolPref('roundThousands');
		var roundMillions = prefs.getBoolPref('roundMillions');
		var labelStyle = prefs.getCharPref('alexaLabelStyle');
		
		if (rank > 999999 && roundMillions) {
			var tmp = parseInt(rank) / 1000000;
			rankLabel = Math.floor(tmp*10)/10 + 'M'; // round numbers down to 1 precision
		}
		else if (rank > 9999 && roundThousands) {
			var tmp = Math.floor(parseInt(rank) / 1000);
			rankLabel = this.formatNumber(tmp, 0, '', ',') + 'K';
		}
		else if (formatNumbers) {
			rankLabel = this.formatNumber(rank, 0, '', ',');
		} else {
			rankLabel = rank;
		}
		
		rankMenu = (formatNumbers) ? this.formatNumber(rank, 0, '', ',') : rank;
			
		this.removeClass(label, 'googalexa-rank-bg-alexa-transparent');
		//label.value = rankLabel;
		label.setAttribute('value', rankLabel);
		label.setAttribute('style', labelStyle);
		
		menuitem1.setAttribute('label', 'Alexa: ' + rankMenu);
		menuitem2.setAttribute('label', 'Alexa: ' + rankMenu);
	},
	
	addGoogleRankToCache : function(host, rank) {
		var cache = this.cache;
		
		for (var i=0, j=cache.length; i<j; i++) {
			if (cache[i].host == host) {
				this.cache[i].g = rank;
				break;
			}
		}
	},
	
	addAlexaRankToCache : function(host, rank) {
		var cache = this.cache;
		
		for (var i=0, j=cache.length; i<j; i++) {
			if (cache[i].host == host) {
				this.cache[i].a = rank;
				break;
			}
		}
	},
	
	getRanksFromCache : function(host) {
		var cache = this.cache;
		
		for (var i=0, j=cache.length; i<j; i++) {
			if (host == cache[i].host) {
				return {"g": cache[i].g, "a": cache[i].a};
			}
		}
		
		return false;
	},
	
	validScheme : function() {
		var scheme = gBrowser.selectedBrowser.currentURI.scheme;
		
		if (scheme == 'about' || scheme == 'chrome' || scheme == 'file') {
			return false;
		}
	
		return true;
	},
	
	makeGoogleRankLoading : function() {
		var label = document.getElementById('googalexa-google-rank-label'),
			img = document.getElementById('googalexa-google-rank-status-img');
		
		this.addClass(label, 'googalexa-rank-bg-google-transparent');
		// img.className = 'googalexa-rank-loading-img';
		img.setAttribute('class', 'googalexa-rank-loading-img');
		label.removeAttribute('value');
	},
	
	makeGoogleRankNA : function() {
		var label = document.getElementById('googalexa-google-rank-label'),
			img = document.getElementById('googalexa-google-rank-status-img'),
			menuitem1 = document.getElementById('googalexa-menuitem-google-1'),
			menuitem2 = document.getElementById('googalexa-menuitem-google-2');
		
		// img.className = 'googalexa-rank-na-img';
		img.setAttribute('class', 'googalexa-rank-na-img');
		this.addClass(label, 'googalexa-rank-bg-google-transparent');
		label.removeAttribute('value');
		
		menuitem1.setAttribute('label', 'Google: n/a');
		menuitem2.setAttribute('label', 'Google: n/a');
	},
	
	makeAlexaRankLoading : function() {
		var label = document.getElementById('googalexa-alexa-rank-label'),
			img = document.getElementById('googalexa-alexa-rank-status-img');
			
		this.addClass(label, 'googalexa-rank-bg-alexa-transparent');
		img.className = 'googalexa-rank-loading-img';
		label.removeAttribute('value');
	},
	
	makeAlexaRankNA : function() {
		var label = document.getElementById('googalexa-alexa-rank-label'),
			img = document.getElementById('googalexa-alexa-rank-status-img'),
			menuitem1 = document.getElementById('googalexa-menuitem-alexa-1'),
			menuitem2 = document.getElementById('googalexa-menuitem-alexa-2');
		
		img.className = 'googalexa-rank-na-img';
		this.addClass(label, 'googalexa-rank-bg-alexa-transparent');
		label.removeAttribute('value');
		
		menuitem1.setAttribute('label', 'Alexa: n/a');
		menuitem2.setAttribute('label', 'Alexa: n/a');
	},
	
	makeRankBoxVisible : function() {
		var rankbox = document.getElementById('googalexa-rank-box'),
			na_box = document.getElementById('googalexa-na-box');
			
		na_box.className = 'googalexa-hidden';
		rankbox.removeAttribute('class');
	},
	
	makeNABoxVisible : function() {
		var rankbox = document.getElementById('googalexa-rank-box'),
			na_box = document.getElementById('googalexa-na-box'),
			menuitemGoogle1 = document.getElementById('googalexa-menuitem-google-1'),
			menuitemGoogle2 = document.getElementById('googalexa-menuitem-google-2'),
			menuitemAlexa1 = document.getElementById('googalexa-menuitem-alexa-1'),
			menuitemAlexa2 = document.getElementById('googalexa-menuitem-alexa-2');
			
		rankbox.className = 'googalexa-hidden';
		na_box.removeAttribute('class');
		
		
		menuitemGoogle1.setAttribute('label', 'Google: n/a');
		menuitemGoogle2.setAttribute('label', 'Google: n/a');
		menuitemAlexa1.setAttribute('label', 'Alexa: n/a');
		menuitemAlexa2.setAttribute('label', 'Alexa: n/a');
	},
	
	toggleReloadMenuOption : function(enable) {
		var menuOption1 = document.getElementById('googalexa-google-alexa-reload-1'),
			menuOption2 = document.getElementById('googalexa-google-alexa-reload-2');
		
		if (enable) {
			menuOption1.setAttribute('disabled', false);
			menuOption2.setAttribute('disabled', false);
		} else {
			menuOption1.setAttribute('disabled', true);
			menuOption2.setAttribute('disabled', true);
		}
		
		this.currentMenuStatus = enable;
	},
	
	
	googleSiteChecksum : function(b) {
		for (var c = 16909125, d = 0; d < b.length; d++) {
			var HASH_SEED_ = "Mining PageRank is AGAINST GOOGLE'S TERMS OF SERVICE. Yes, I'm talking to you, scammer.";
			c ^= HASH_SEED_.charCodeAt(d % HASH_SEED_.length) ^ b.charCodeAt(d);
			c = c >>> 23 | c << 9
		}
		return this.hexEncodeU32(c)
	},
	
	hexEncodeU32 : function(b) {
		var c = this.toHex8(b >>> 24);
		c += this.toHex8(b >>> 16 & 255);
		c += this.toHex8(b >>> 8 & 255);
		return c + this.toHex8(b & 255)
	},
	
	toHex8 : function(b) {
		return (b < 16 ? "0" : "") + b.toString(16)
	},
	
	// trims (<String.trim>) a string AND removes all the double spaces in a string.
	clean : function(str) {
		//return trim(str.replace(/\s{2,}/g, ' '));
		return str.replace(/\s{2,}/g, ' ').trim();
	},
		
	hasClass : function(el, className) {
		return el.className.indexOf(className, ' ') != -1;
	},

	addClass : function(el, className) {
		if (!this.hasClass(el, className)) el.className = this.clean((el.className + ' ' + className));
	},

	removeClass : function(el, className) {
		el.className = this.clean(el.className.replace(new RegExp('(^|\\s)' + className + '(?:\\s|$)'), '$1'));
	},

	formatNumber : function(num, c, d, t) {
		var n = num, c = isNaN(c = Math.abs(c)) ? 2 : c, d = d == undefined ? "," : d, t = t == undefined ? "." : t, s = n < 0 ? "-" : "", i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", j = (j = i.length) > 3 ? j % 3 : 0;
		return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
	}
	
};

 
 

Googalexa.BrowserOverlay = {

	addonWasOnTheNavigatorToolbarBeforeCustomization: -1,
	
	init : function () {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
             .getService(Components.interfaces.nsIPrefService)
             .getBranch("extensions.googalexa.");

    let firstRun = prefs.getBoolPref("firstRun");
		if (firstRun) {
      prefs.setBoolPref("firstRun", false);
			var installed = this.installAddon("nav-bar-customization-target", "googalexa-toolbaritem");
			if (!installed) {	// then it's FF version < 29
				this.installAddon("nav-bar", "googalexa-toolbaritem");
			}
		} else if (this.addonIsOnTheNavigatorToolbar() == false) {
			this.addonWasOnTheNavigatorToolbarBeforeCustomization = false;
			return;
		}
		
		this.addonWasOnTheNavigatorToolbarBeforeCustomization = true;
		

		if (this.rankButtonXULLoaded() == false) {
			this.loadRankButtonXUL();
		} else {
			this.prepareAddonAndCreateEventListeners();
		}

		
		// gBrowser.addProgressListener(this.urlBarListener);
	},

	prepareAddonAndCreateEventListeners: function() {
		var navigatorToolbox = document.getElementById('navigator-toolbox');
		Googalexa.BrowserOverlay.rebuildAddonDisplay(navigatorToolbox);
		gBrowser.addProgressListener(Googalexa.BrowserOverlay.urlBarListener);
	},

	
	uninit: function() {
		gBrowser.removeProgressListener(this.urlBarListener);
	},

	
	urlBarListener : {  
		onLocationChange: function(aProgress, aRequest, aURI) {
			
			// if (this.addonIsOnTheNavigatorToolbar() == false) return;

			var scheme= aURI.scheme;
			if (scheme == 'about' || scheme == 'chrome' || scheme == 'file') {
				//	Components.utils.reportError('should set to NA, since sheme: ' + aURI.scheme);
				Googalexa.makeNABoxVisible();
				Googalexa.toggleReloadMenuOption(0);
				
			} else {
				Googalexa.pageLoaded(aURI.host);
			}
		}			
	},

	OverlayObserver : {
		observe: function() {
			Googalexa.BrowserOverlay.prepareAddonAndCreateEventListeners();
			window.dispatchEvent(GoogalexaXULLoadedEvent);
		}
	},

	
	installAddon : function(toolbarId, id, afterId) {  
		if (document.getElementById(id))
			return false;

		//if (! document.getElementById(id)) {  
			var toolbar = document.getElementById(toolbarId);  
		if (! toolbar)
			return false;
	  
			// If no afterId is given, then append the item to the toolbar  
			var before = null;  
			if (afterId) {  
				let elem = document.getElementById(afterId);  
				if (elem && elem.parentNode == toolbar)  
					before = elem.nextElementSibling;  
			}  
	  
			toolbar.insertItem(id, before);  
			toolbar.setAttribute("currentset", toolbar.currentSet);  
			document.persist(toolbar.id, "currentset");  
	  
			if (toolbarId == "addon-bar")
				toolbar.collapsed = false;  

			return true;
		//}
	},


	loadRankButtonXUL: function() {
		// load rank button overlay
		// when XUL loaded event passed to Observer
		document.loadOverlay('chrome://googalexa/content/ranks.xul', this.OverlayObserver);
	},

	rankButtonXULLoaded: function() {
		var rankButton = document.getElementById('googalexa-rank-button-2');
		return (rankButton == null) ? false : true;
	},


	rebuildAddonDisplay: function(navigatorToolbox) {
		let mode = navigatorToolbox.getAttribute('mode');
		
		var iconButton = document.getElementById('googalexa-rank-button-1'),
			rankButton = document.getElementById('googalexa-rank-button-2');

		switch (mode) {
			case 'full':
				var rankButtonLabel = document.getElementById('googalexa-rank-button-label');
				Googalexa.addClass(iconButton, 'googalexa-hidden');
				Googalexa.removeClass(rankButton, 'googalexa-hidden');
				Googalexa.removeClass(rankButtonLabel, 'googalexa-hidden');
				break;

			case 'icons':
				var rankButtonLabel = document.getElementById('googalexa-rank-button-label');
				Googalexa.addClass(iconButton, 'googalexa-hidden');
				Googalexa.removeClass(rankButton, 'googalexa-hidden');
				Googalexa.addClass(rankButtonLabel, 'googalexa-hidden');
				break;

			case 'text':
				Googalexa.removeClass(iconButton, 'googalexa-hidden');
				Googalexa.addClass(rankButton, 'googalexa-hidden');
				break;
		}
	},


	addonIsOnTheNavigatorToolbar: function() {
		var addon = document.getElementById('googalexa-toolbaritem');
		return (addon == null) ? false : true;
	},


	customizeStart: function(e) {
		let theToolbox = e.target;

		//Firebug.Console.log(document.getElementById('googalexa-toolbaritem'));
		//Firebug.Console.log(document.getElementById('nav-bar'));

		// now we know the user has started customizing
		if (Googalexa.BrowserOverlay.addonIsOnTheNavigatorToolbar() == false)
			return;


		// show the icon button, and remove rank button
		var iconButton = document.getElementById('googalexa-rank-button-1'),
			rankButton = document.getElementById('googalexa-rank-button-2');
		
		Googalexa.removeClass(iconButton, 'googalexa-hidden');
		Googalexa.addClass(rankButton, 'googalexa-hidden');

	 	// Firebug.Console.log(theToolbox);
	},


	customizeEnd: function(e) {
		let theToolbox = e.target;
		
		// the user has finished customizing

		if (Googalexa.BrowserOverlay.addonIsOnTheNavigatorToolbar() == false) {
			// user removed addon from navigator toolbar. Remove event listenvers
			if (Googalexa.BrowserOverlay.addonWasOnTheNavigatorToolbarBeforeCustomization == true) {
				Googalexa.BrowserOverlay.uninit();
			}
			Googalexa.BrowserOverlay.addonWasOnTheNavigatorToolbarBeforeCustomization = false;
			return;
		}


		// user adds addon to the navigator toolbar. When borwser loaded addon was not there.
		if (Googalexa.BrowserOverlay.rankButtonXULLoaded() == false) {
			Googalexa.BrowserOverlay.init();
			window.addEventListener('gaxulloaded', function load() {
				Googalexa.reload();
				window.removeEventListener('gaxulloaded', load, false);
			}, false);
		} else if (Googalexa.BrowserOverlay.addonWasOnTheNavigatorToolbarBeforeCustomization == false) {
			// user adds addon to the navigar toolbar. Browser was loaded with addon originally
			Googalexa.BrowserOverlay.init();
			Googalexa.reload();
		} else {
			Googalexa.BrowserOverlay.rebuildAddonDisplay(theToolbox);
		}

		Googalexa.BrowserOverlay.addonWasOnTheNavigatorToolbarBeforeCustomization = true;

		// Firebug.Console.log(theToolbox);
	}
}


window.addEventListener("load", function() {Googalexa.BrowserOverlay.init();}, false);
window.addEventListener("unload", function() {Googalexa.BrowserOverlay.uninit()}, false);


window.addEventListener("beforecustomization", Googalexa.BrowserOverlay.customizeStart, false);
window.addEventListener("aftercustomization", Googalexa.BrowserOverlay.customizeEnd, false);
// window.addEventListener("customizationchange", customizeChange, false);

var GoogalexaXULLoadedEvent = document.createEvent('Event');
GoogalexaXULLoadedEvent.initEvent('gaxulloaded', true, true);
 
