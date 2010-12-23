var supportsTouch = !!window.Touch;

// Maze stuff

function HelpWindow(options) {
	var elm = document.createElement("div");
	elm.className = "help-window";
	
	var content = options.content;
	if (content) {
		elm.appendChild((content instanceof Node) ? content :
			document.createTextNode(content));
	}
	if (supportsTouch) {
		elm.addEventListener("touchstart", function (e) {
			e.preventDefault();
		}, false);
	}
	
	return elm;
}

function rgba(r, g, b, a) {
	return "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";
}

function Marker(options) {
	var element = this.element = document.createElement("div");
	element.className = "marker";
	var s = element.style;
	
	s.left = (+options.x || 0) + "px";
	s.top = (+options.y || 0) + "px";
	
	var r = +options.radius || 13;
	s.width = s.height = 2*r - 1 + "px";
	s.borderRadius = s.MozBorderRadius = s.WebkitBorderRadius = r + "px";
	s.margin = -r + "px";
	
	var color = this.colors[options.color] || this.colors.green;
	s.borderColor = color.border;
	s.backgroundColor = color.background;
}
Marker.prototype = {
	element: null,
	
	highlight: function () {
		this.element.className = "marker highlight";
	},
	
	unhighlight: function () {
		this.element.className = "marker";
	},
	
	colors: {
		green: {
			border: rgba(0, 200, 0, 1),
			background: rgba(0, 255, 0, 0.5)
		},
		blue: {
			border: rgba(0, 127, 255, 1),
			background: rgba(0, 160, 255, 0.5)
		}
	}
};

// Tile

function Tile(x, y, w, h) {
	this.offsetX = x * w;
	this.offsetY = y * h;
	var el = this.element = document.createElement("canvas");
	el.width = w;
	el.height = h;
	el.style.width = w + "px";
	el.style.height = h + "px";
	el.style.left = x * w + "px";
	el.style.top = y * h + "px";
	el.className = "layer tile";
	this.ctx = el.getContext("2d");
	this.ctx.lineCap = this.ctx.lineJoin = "round";
}
Tile.prototype = {
	offsetX: NaN,
	offsetY: NaN,
	element: null,
	ctx: null,
	isEmpty: true,
	info: {},
	
	drawLine: function (x1, y1, x2, y2, color) {
		var ctx = this.ctx;
		ctx.strokeStyle = "#0f0";
		ctx.beginPath();
		ctx.moveTo(x1 - this.offsetX, y1 - this.offsetY);
		ctx.lineTo(x2 - this.offsetX, y2 - this.offsetY);
		ctx.stroke();
	},
	
	loadImageSrc: function (src) {
		var clearFirst = !this.isEmpty;
		var self = this;
		var img = new Image();
		// Draw the image once it is loaded.
		img.onload = function () {
			if (clearFirst) self.clear();
			self.drawImage(img);
		};
		// We can't say the image is empty until it has loaded,
		// but if it is a 404, then it is empty.
		img.onerror = this.empty.bind(this);
		this.isEmpty = false;
		img.src = src;
		// to do: show a loading sign?
	},
	
	drawImage: function (img) {
		this.isEmpty = false;
		this.ctx.drawImage(img, 0, 0);
	},
	
	empty: function () {
		this.isEmpty = true;
	},
	
	clear: function () {
		this.empty();
		this.ctx.clearRect(0, 0, this.element.width, this.element.height);
		//this.element.width += 0;
	},
	
	hide: function () {
		this.element.style.display = "none";
	},
	
	show: function () {
		this.element.style.display = "";
	},
	
	toString: function () {
		return "[Tile " + this.offsetX + "," + this.offsetY + "]";
	},
	
	// get PNG base64 data
	exportPNG: function () {
		var dataURL = this.element.toDataURL("image/png");
		var imageData = dataURL.substr('data:image/png;base64,'.length);
		return imageData;
	},
	
	// given a point relative to the maze, return it relative to the tile
	getPointRelative: function (absPoint) {
		return [absPoint[0] - this.offsetX, absPoint[1] - this.offsetY];
	}
};
Tile.hide = Tile.prototype.hide.unbind();
Tile.show = Tile.prototype.show.unbind();

// TiledCanvas

function TiledCanvas(tileWidth, tileHeight) {
	this.tileWidth = +tileWidth;
	this.tileHeight = +tileHeight;
	this.tiles = {};
	this.element = document.createElement("div");
	this.element.className = "layer";
}
TiledCanvas.prototype = {
	element: null,
	tileWidth: NaN,
	tileHeight: NaN,
	tiles: null, // 2d array
	visibleTiles: null, // array
	
	getTileAtPixel: function (x, y) {
		return this.getTile(
			Math.floor(x / this.tileWidth),
			Math.floor(y / this.tileHeight)
		);
	},
	
	initTile: function (tile, x, y) {},
	
	// tile coords, not pixels
	getTile: function (x, y) {
		var row = this.tiles[y] || (this.tiles[y] = {});
		if (x in row) {
			return row[x];
		}
		var tile = row[x] = new Tile(x, y, this.tileWidth, this.tileHeight);
		this.initTile(tile, x, y);
		this.element.appendChild(tile.element);
		return tile;
	},
	
	drawLine: function (x0, y0, x1, y1, color) {
		var w = this.tileWidth;
		var h = this.tileHeight;
		var self = this;
		line(x0 / w, y0 / h, x1 / w, y1 / h, function (x, y) {
			self.getTile(x, y).drawLine(x0, y0, x1, y1, color);
		});
	},
	
	// useful buffer
	_getBufferCtx: (function () {
		var bufferCanvas = document.createElement("canvas");
		var bufferCtx = bufferCanvas.getContext("2d");
		return function (w, h) {
			bufferCanvas.height = h;
			bufferCanvas.width = w;
			return bufferCtx;
		};
	})(),
	
	getImageData: function (x, y, w, h) {
		var tiles = this.getTilesInRect(x, y, x + w, y + h);
		if (tiles.length == 1) {
			var tile = tiles[0];
			return tile.ctx.getImageData(x-tile.offsetX, y-tile.offsetY, w, h);
		}
		var buffer = this._getBufferCtx(w, h);
		var tW = this.tileWidth;
		var tH = this.tileHeight;
		tiles.forEach(function (tile) {
			var dx = x - tile.offsetX;
			var dy = y - tile.offsetY;
			// where in the tile to start the getimagedata rect
			var tileX = Math.max(0, dx);
			var tileY = Math.max(0, dy);
			// where in the buffer to place it
			var offsetX = Math.max(0, -dx);
			var offsetY = Math.max(0, -dy);
			// size of the getimagedata rect in the tile
			var getW = Math.min(256, dx + w, tW - dx, w);
			var getH = Math.min(256, dy + h, tH - dy, h);
			var data = tile.ctx.getImageData(tileX, tileY, getW, getH);
			buffer.putImageData(data, offsetX, offsetY);
		});
		return buffer.getImageData(0, 0, w, h);
	},
	
	putImageData: function (imageData, x, y) {
		var tiles = this.getTilesInRect(x, y, x + imageData.width,
			y + imageData.height);
		tiles.forEach(function (tile) {
			tile.ctx.putImageData(imageData, x-tile.offsetX, y-tile.offsetY);
		});
	},
	
	getAllTiles: function () {
		var tiles = [];
		// Can't use native array methods because of negative indexes.
		for (var y in this.tiles) {
			var row = this.tiles[y];
			for (var x in row) {
				tiles.push(row[x]);
			}
		}
		return tiles;
	},
	
	getVisibleTiles: function () {
		return this.visibleTiles || (this.visibleTiles = this.getAllTiles());
	},
	
	getTilesInRect: function (x0, y0, x1, y1) {
		var tiles = [];
		var left   = Math.floor(x0 / this.tileWidth);
		var top    = Math.floor(y0 / this.tileHeight);
		var right  = Math.ceil(x1 / this.tileWidth);
		var bottom = Math.ceil(y1 / this.tileHeight);
		
		for (var x = left; x < right; x++) {
			for (var y = top; y < bottom; y++) {
				tiles.push(this.getTile(x, y));
			}
		}
		return tiles;
	},
	
	setVisibleTiles: function (tiles) {
		// todo: optimize this, maybe
		this.getVisibleTiles().forEach(Tile.hide);
		(this.visibleTiles = tiles).forEach(Tile.show);
	},
	
	// not pixels!
	getTileCoords: function (tile) {
		return [
			tile.offsetX / this.tileWidth,
			tile.offsetY / this.tileHeight
		];
	},
	
	clearTile: function (tile) {
		this.clearRect(tile.offsetX, tile.offsetY,
			this.tileWidth, this.tileHeight);
	},
	
	clearRect: function (x, y, w, h) {
		var tiles = this.getTilesInRect(x, y, x + w, y + h);
		tiles.forEach(function (tile) {
			tile.ctx.clearRect(x - tile.offsetX, y - tile.offsetY, w, h);
		});
	}
};

// MazeViewer

function MazeViewer(options) {
	this.bindMethods(this.onResize, this.onMouseDown, this.onMouseDrag,
		this.onMouseMove, this.onMouseUp, this.onTouchStart, this.onTouchMove,
		this.onTouchEnd, this.possibleDirections);

	this.element = document.createElement("div");
	this.element.className = "layer maze";
	
	this.centerer = document.createElement("div");
	this.centerer.className = "layer centerer";
	this.element.appendChild(this.centerer);
	
	if (options) {
		if (options.loader) {
			this.loader = options.loader;
			this.tileSize = this.loader.getTileSize();
			this.startPos = this.loader.getStartPos();
		}
		if (options.container) options.container.appendChild(this.element);
	}
	
	this.centerX = this.startPos[0];
	this.centerY = this.startPos[1];

	this.mazeCanvas = new TiledCanvas(this.tileSize[0], this.tileSize[1]);
	this.mazeCanvas.initTile = this.initMazeTile.bind(this);
	this.centerer.appendChild(this.mazeCanvas.element);
	
	// Create player marker, but don't add it until we enter the maze.
	this.playerMarker = document.createElement("div");
	this.playerMarker.className = "player-marker";
	
	this.setPosition(this.startPos[0], this.startPos[1]);
	
	this.showStartMarker();
	//this.showHelpWindow();
	
	this.updateViewport();
	this.updateOffset();
}

MazeViewer.prototype = {
	constructor: MazeViewer,
	
	element: null, // contains the whole maze viewer
	centerer: null, // child of element. contains maze
	overlay: null, // child of centerer. contains player's path and marker
	
	//title: "",
	entered: false,
	mazeCanvas: null, // TiledCanvas
	x: NaN, // player coords
	y: NaN,
	offsetX: NaN, // for mouse handling
	offsetY: NaN,
	centerX: NaN, // viewport position
	centerY: NaN,
	playerMarker: null, //div
	tileSize: [256, 256],
	startPos: [127, 127],
	isInViewMode: true,
	pathColor: "#0f0",
	loader: null, // MazeLoader, for saving and getting tiles
	correctionAmount: 5,
	
	load: function () {
		window.addEventListener("resize", this.onResize, false);
		window.addEventListener("orientationchange", this.onResize, false);
		this.updateViewport();
	},
	
	unload: function () {
		window.removeEventListener("resize", this.onResize, false);
		window.removeEventListener("orientationchange", this.onResize, false);
	},
		
	bindMethods: function () {
		for (var i = 0; i < arguments.length; i++) {
			var method = arguments[i];
			var boundMethod = method.bind(this);
			for (var prop in this) {
				if (this[prop] == method) {
					this[prop] = boundMethod;
				}
			}
		}
	},
	
	initMazeTile: function (tile, x, y) {
		var tileSrc = this.loader.getTileSrc(x, y);
		if (tileSrc) {
			tile.loadImageSrc(tileSrc);
		}
		// add creator info, and other stuff
		var tileInfo = this.loader.getTileInfo(x, y);
		if (tileInfo) {
			tile.info = tileInfo;
		}
	},
	
	showStartMarker: function () {
		var marker = this.startPosMarker = new Marker({
			x: this.startPos[0],
			y: this.startPos[1]
		});
		if (supportsTouch) {
			marker.element.addEventListener("touchmove",
			function (e) {
				e.preventDefault();
				this.enterMaze();
				this.onTouchStart(e);
			}.bind(this), false);
		} else {
			marker.element.addEventListener("mouseover",
				this.enterMaze.bind(this), false);
		}
		this.centerer.appendChild(marker.element);
	},
	
	showHelpWindow: function () {
		var helpWindow = this.helpWindow = new HelpWindow({
			content: "Move your mouse through the maze, starting here!"
		});
		helpWindow.style.left = this.startPos[0] + "px";
		helpWindow.style.top = this.startPos[1] - 80 + "px";
		var marker = this.startPosMarker;
		helpWindow.onmouseover = marker.highlight.bind(marker);
		helpWindow.onmouseout = marker.unhighlight.bind(marker);
		this.centerer.appendChild(helpWindow);
	},
	
	hideHelpWindow: function () {
		var helpWindow = this.helpWindow;
		if (helpWindow) {
			Transition(helpWindow, {opacity: 0}, 250,
				this.centerer.removeChild.bind(this.centerer, helpWindow));
			delete this.helpWindow;
		}
	},
	
	onResize: function () {
		this.updateViewport();
	},
	
	enterMaze: function () {
		if (this.entered) return false;
		this.entered = true;
		
		addClass(this.centerer, "in");
		
		// hide start marker
		var self = this;
		Transition(this.startPosMarker.element, {opacity: 0}, 250, function () {
			self.centerer.removeChild(self.startPosMarker.element);
			delete self.startPosMarker;
		});
		
		
		this.hideHelpWindow();
		
		this.overlay = new TiledCanvas(256, 256);
		this.overlay.element.style.opacity = 0.6;
		this.centerer.appendChild(this.overlay.element);
		
		if (supportsTouch) {
			this.centerer.addEventListener("touchstart",
				this.onTouchStart, false);
		} else {
			this.updateOffset();
			this.centerer.addEventListener("mousedown", this.onMouseDown, false);
			this.centerer.addEventListener("mousemove", this.onMouseMove, false);
		}
		
		// add player marker (red dot)
		this.centerer.appendChild(this.playerMarker);
	},
	
	onTouchStart: function (e) {
		// only add listeners with the first finger.
		if (e.targetTouches.length == 1) {
			document.addEventListener("touchmove", this.onTouchMove, false);
			document.addEventListener("touchend", this.onTouchEnd, false);
			this.updateTouch(e);
		}
		
		this.updateOffset();
		this.onTouchMove(e);
	},
	
	updateTouch: function (e) {
		var x = 0;
		var y = 0;
		var numTouches = e.touches.length;
		for (var i = 0; i < numTouches; i++) {
			x += e.touches[i].pageX;
			y += e.touches[i].pageY;
		}
		this.pageX = x / numTouches;
		this.pageY = y / numTouches;
	},
	
	onTouchMove: function (e) {
		e.preventDefault();
		var numTouches = e.touches.length;
		if (numTouches == 1) {
			this.moveToPixel(
				e.touches[0].pageX - this.offsetX,
				e.touches[0].pageY - this.offsetY
			);
		} else {
			var prevPageX = this.pageX;
			var prevPageY = this.pageY;
			this.updateTouch(e);
			this.scrollTo(
				this.centerX + prevPageX - this.pageX,
				this.centerY + prevPageY - this.pageY
			);
		}
	},
	
	onTouchEnd: function (e) {
		document.removeEventListener("touchmove", this.onTouchMove, false);
		document.removeEventListener("touchend", this.onTouchEnd, false);
		this.updateViewport();
	},
	
	// precomputes the maze's page offset, so we can use e.pageX/Y - this.offsetX/Y to determine mouse position relative to the maze.
	updateOffset: function () {
		var x = 0, y = 0;
		for (var el = this.centerer; el; el = el.offsetParent) {
			x += el.offsetLeft;
			y += el.offsetTop;
		}
		this.offsetX = x;
		this.offsetY = y;
	},
	
	onMouseMove: function (e) {
		if (!this.isInViewMode) return;
		this.moveToPixel(
			e.pageX - this.offsetX,
			e.pageY - this.offsetY
		);
	},
	
	onMouseDown: function (e) {
		// ignore right click
		if (e.which == 2 || e.button == 2) return;
		
		this.pageX = e.pageX;
		this.pageY = e.pageY;
		e.preventDefault();
		addClass(this.centerer, 'moving'); // change cursor
		this.centerer.removeEventListener("mousemove", this.onMouseMove, false);
		document.addEventListener("mousemove", this.onMouseDrag, false);
		document.addEventListener("mouseup", this.onMouseUp, false);
	},
	
	onMouseUp: function (e) {
		this.updateOffset();
		removeClass(this.centerer, 'moving');
		this.centerer.addEventListener("mousemove", this.onMouseMove, false);
		document.removeEventListener("mousemove", this.onMouseDrag, false);
		document.removeEventListener("mouseup", this.onMouseUp, false);
		//this.updateViewport();
	},
	
	onMouseDrag: function (e) {
		this.scrollTo(
			this.centerX + this.pageX - (this.pageX = e.pageX),
			this.centerY + this.pageY - (this.pageY = e.pageY)
		);
	},
	
	scrollTo: function (x, y) {
		this.centerX = x;
		this.centerY = y;
		this.updateViewport();
	},
	
	updateViewport: function (transition) {
		var mazeCanvas = this.mazeCanvas;
		var parent = this.centerer.offsetParent; //this.container
		if (!parent) {
			mazeCanvas.setVisibleTiles([]);
			return;
		}
		var x = this.centerX;
		var y = this.centerY;
		var width = parent.offsetWidth;
		var height = parent.offsetHeight;
		var oldTiles = mazeCanvas.getVisibleTiles();
		var newTiles = mazeCanvas.getTilesInRect(
			x - width / 2, //-c.offsetLeft,
			y - height / 2, //-c.offsetTop,
			x + width / 2, //this.container.offsetWidth - c.offsetLeft,
			y + width / 2 //this.container.offsetHeight - c.offsetTop
		);
		if (!transition || !this.entered) {
			// Instant move
			this.centerer.style.marginLeft = -x + "px";
			this.centerer.style.marginTop = -y + "px";
			mazeCanvas.setVisibleTiles(newTiles);
		} else {
			// Transition move
			var combinedTiles = [].concat(oldTiles, newTiles);
			mazeCanvas.setVisibleTiles(combinedTiles);
			Transition(this.centerer, {
				marginLeft: -x + "px",
				marginTop: -y + "px"
			}, 500, function () {
				mazeCanvas.setVisibleTiles(newTiles);
			});
		}
	},
	
	// directly set the player's position.
	setPosition: function (x, y) {
		this.x = x;
		this.y = y;
		
		this.playerMarker.style.left = x + "px";
		this.playerMarker.style.top = y + "px";
	},
	
	// move toward a pixel
	moveToPixel: function (xTo, yTo) {
		var route = findRoute(point(this.x, this.y), point(xTo, yTo),
			this.possibleDirections, this.correctionAmount);
		this.setPosition(route.point.x, route.point.y);
		while (route) {
			var prev = route.from;
			if (prev) {
				this.overlay.drawLine(prev.point.x, prev.point.y,
					route.point.x, route.point.y, this.pathColor);
			}
			route = prev;
		}
	},
	
	// get passable neighboring points
	isColorPassable: function (r, g, b, a) {
		var fg = (r + g + b) * a;
		// change 0 to 765 for passable bg
		var bg = 0 * (255 - a);
		return fg + bg > 82000; //97537;
	},

	// get passable neighboring points
	possibleDirections: function (from) {
		var x = from.x;
		var y = from.y;
		var data = this.mazeCanvas.getImageData(x - 1, y - 1, 3, 3).data;

		var isColorPassable = this.isColorPassable;
		function isPassable(x, y) {
			var i = 4 * (y * 3 + x);
			return isColorPassable(data[i++], data[i++], data[i++], data[i]);
		}
		
		var n = isPassable(1, 0) && point(x, y - 1);
		var s = isPassable(1, 2) && point(x, y + 1);
		var w = isPassable(0, 1) && point(x - 1, y);
		var e = isPassable(2, 1) && point(x + 1, y);
		/*var ne = (n || e) && isPassable(2, 0) && point(x + 1, y - 1);
		var se = (s || e) && isPassable(2, 2) && point(x + 1, y + 1);
		var sw = (s || w) && isPassable(0, 2) && point(x - 1, y + 1);
		var nw = (n || w) && isPassable(0, 0) && point(x - 1, y - 1);*/
		return [n, s, e, w /*, ne, se, sw, nw */].filter(Boolean);
	}
};

var MazeLoader = Classy({
	db: null,
	mazeDoc: null,
	mazeId: "",
	
	constructor: function (db, doc) {
		this.db = db;
		this.mazeDoc = doc;
		this.mazeId = doc._id;
	},
	
	getTileSrc: function (x, y) {},
	
	getTileInfo: function (x, y) {
		return {};
	},
	
	getDocAttachmentsPath: function (id) {
		return this.db.uri + Couch.encodeDocId(id) + "/";
	},
	
	getStartPos: function () {
		return this.mazeDoc.start || MazeViewer.prototype.startPos;
	},
	
	getTileSize: function () {
		return this.mazeDoc.tile_size || MazeViewer.prototype.tileSize;
	},

	saveTileDrawing: function (tile, tileCoords, onError, onSuccess) {
		onError(0, "Saving is not yet implemented.");
	}
});
