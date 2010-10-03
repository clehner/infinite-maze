Couch.urlPrefix = "/couchdb";

var supportsTouch = !!window.Touch;

if (window.applicationCache &&
	applicationCache.status != applicationCache.UNCACHED) {
	
	applicationCache.addEventListener("updateready", function () {
		// Todo:
		// Make sure something important isn't happening before we refresh.
		applicationCache.update();
		applicationCache.swapCache();
		location.reload();
	}, false);
}

function Page(title, content) {
	this.page = document.createElement("div");
	this.element = document.createElement("div");
	if (title) this.title = title;
	if (content) this.element.innerHTML = content;
}
Page.prototype = {
	element: null,
	title: "",
	onLoad: function () {},
	onUnload: function () {}
};

function MazesListPage(mazesDb) {
	this.title = "Mazes";
	this.element = document.getElementById("mazes-list-page");
	var list = document.getElementById("mazes-list");
	
	mazesDb.view("maze/all", {
		success: function (data) {
			renderList(data.rows);
		},
		error: function () {
			list.innerHTML = "Unable to load the list.";
		}
	});
	
	function renderList(rows) {
		//list.innerHTML = "";
		for (var i = 0; i < rows.length; i++) {
			var row = rows[i];
			var li = document.createElement("li");
			
				var href = "#/mazes/" + encodeURIComponent(row.id);
				var title = row.value.title;
				var a = document.createElement("a");
				a.setAttribute("href", href);
				a.appendChild(document.createTextNode(title));
				li.appendChild(a);
			
			list.appendChild(li);
		}
	}
};

function SimplePage(id) {
	this.element = document.getElementById(id);
	this.title = this.element.getAttribute("title");
}

var getSimplePage = function (id) {
	return new SimplePage(id);
}.memoized();

// Maze Controller

var mazesDb = Couch.db("maze");//db");

var pageHandlers = {
	"": getSimplePage.curry("home-page"),
	"_404": getSimplePage.curry("not-found-page"),
	"login": getSimplePage.curry("login-page"),
	"draw": getSimplePage.curry("draw-page"),
	"mazes": function (path) {
		var mazeId = path[0];
		if (!mazeId) {
			return new MazesListPage(mazesDb);
		}
		return new MazePage(mazeId, mazesDb, MazeController);
	}
};

function updateHash() {
	MazeController.setPath(location.hash.substr(1));
}
	
var MazeController;

function init() {
	if (!window.JSON) {
		loadScript("/scripts/json2.js", init2);
	} else {
		init2();
	}
}

function init2() {
	var container = document.getElementById("main");
	var titleElement = document.getElementById("title");
	MazeController = new Site(pageHandlers, container, titleElement);
	
	if (supportsTouch) {
		document.body.addEventListener("touchmove", function (e) {
			e.preventDefault();
		}, false);
	}
	
	window.addEventListener("hashchange", updateHash, false);
	updateHash();
}

function Site(dirHandlers, main, titleElement) {
	var self = this;
	
	// clear the title and replace it with our own text node.
	titleElement.innerHTML = "";
	var titleText = titleElement.appendChild(document.createTextNode(""));
	
	var currentPage;

	var getPageAtPath = function (path) {
		if (path[0] == "/") path = path.substr(1);
		var dirs = path.split("/");
		for (
			var handlers = dirHandlers, dir;
			handlers;
			dir = dirs.shift(), handlers = handlers[dir]
		) {
			if (typeof handlers == "function") {
				return handlers(dirs);
			}
		}
		if (typeof dirHandlers._404 == "function") {
			return dirHandlers._404(path);
		}
		return new Page(); // default page;
	}.memoized();
	
	this.setPath = function (path) {
		this.setPage(getPageAtPath(path));
	};
	
	this.setPage = function (page) {
		if (currentPage) {
			if (page == currentPage) return;
			if (currentPage.onUnload) currentPage.onUnload();
			main.removeChild(currentPage.element);
		}
		currentPage = page;
		if (!page.element) {
			throw new Error("Page at \"" + path + "\"has no element");
		}
		main.appendChild(page.element);
		self.updateTitle();
		if (page.onLoad) page.onLoad();
	};
	
	this.updateTitle = function () {
		titleText.nodeValue = currentPage.title || "";
	};
	
	/*var prefPrefix = "mazePrefs.";
	
	var getPref = window.localStorage ? function (name) {
		return localStorage.getItem(prefPrefix + name);
	} : function () {};
	
	var setPref = window.localStorage ? function (name, value) {
		localStorage.setItem(prefPrefix + name, value);
	} : function () {};*/
	
	/*,
	getPref: getPref,
	setPref: setPref
	*/
}

// MazePage

function MazePage(id, mazesDb, controller) {
	this.controller = controller;
	this.url = mazesDb.uri + Couch.encodeDocId(id) + "/";
	this.element = document.createElement("div");

	window.maze = this;

	mazesDb.openDoc(id, {
		success: this.loadDoc.bind(this),
		error: this.fail.bind(this)
	});
}
MazePage.prototype = {
	constructor: MazePage,
	
	doc: null,
	url: "",
	controller: null,
	element: null,
	title: "",
	loaded: false,

	loadDoc: function (doc) {
		if (!doc) {
			alert('Error, no maze doc!');
			return;
		}
		this.doc = doc;
		this.title = doc.title;
		this.controller && this.controller.updateTitle();
		this.maze = new MazeViewer({
			startPos: doc.start,
			tileSize: doc.tile_size,
			getTileSrc: this.getTileSrc.bind(this)
		});
		this.element.appendChild(this.maze.element);
		if (this.loaded) {
			this.maze.load();
		}
	},
	
	fail: function () {
		this.title = "Maze?";
		this.element.innerHTML = "There is no maze with that name.";
		this.controller && this.controller.updateTitle();
	},
	
	getTileSrc: function (x, y, cb) {
		var tileSrc = (this.doc.tiles[y] || {})[x];
		//var isAttached = (tileSrc in this.doc.attachments);
		//var isAbsolute = (tileSrc[0] == "/") || (!tileSrc.indexOf("http:"));
		//if (isAttached || isAbsolute) {
		if (tileSrc && (tileSrc in this.doc._attachments)) {
			cb(this.url + tileSrc);
		} else {
			cb(null);
		}
	},
	
	onLoad: function () {
		if (this.maze) {
			this.maze.load();
		} else {
			this.loaded = true;
		}
	},
	
	unUnload: function () {
		this.maze.unload();
	}
};