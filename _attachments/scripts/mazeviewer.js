var supportsTouch = ('ontouchstart' in document.documentElement);

// Maze stuff

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
	_onLoad: null,

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
		loadImage(src, function success(img) {
			if (clearFirst) self.clear();
			self.drawImage(img);
			self._stopLoader();
			self._loaded();
		}, function error(e) {
			console.log("Error loading image", e);
			self.empty();
			self._loaded();
		});
		this.isEmpty = false;
	},

	// call a function when the tile is loaded
	onLoad: function (cb) {
		if (this.isEmpty) {
			this._onLoad = cb;
		} else {
			cb();
		}
	},

	_loaded: function () {
		if (this._onLoad) {
			this._onLoad();
			delete this._onLoad;
		}
	},

	_startLoader: function () {
		addClass(this.element, "loading");
	},

	_stopLoader: function () {
		removeClass(this.element, "loading");
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
Tile.hide = function (tile) { tile.hide(); }
Tile.show = function (tile) { tile.show(); }

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
	visibleTiles: [], // array

	getTileAtPixel: function (x, y) {
		return this.getTile(
			Math.floor(x / this.tileWidth),
			Math.floor(y / this.tileHeight)
		);
	},

	initTile: function (tile, x, y) {},

	// tile coords, not pixels
	getTile: function (x, y) {
		if (y == null) {
			// allow array as single argument alternative
			y = x[1];
			x = x[0];
		}
		var row = this.tiles[y] || (this.tiles[y] = {});
		if (x in row) {
			return row[x];
		}
		var tile = row[x] = new Tile(x, y, this.tileWidth, this.tileHeight);
		this.initTile(tile, x, y);
		this.element.appendChild(tile.element);
		return tile;
	},

	drawLine: function (from, to, color) {
		var w = this.tileWidth;
		var h = this.tileHeight;
		var x0 = from[0];
		var y0 = from[1];
		var x1 = to[0];
		var y1 = to[1];
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
		var tiles = this.getTilesInRect(x, y, w, h);
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
		var tiles = this.getTilesInRect(x, y, imageData.width,
			imageData.height);
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
		return this.visibleTiles;
	},

	getTilesInRect: function (x0, y0, w, h) {
		var tiles = [];
		var left   = Math.floor(x0 / this.tileWidth);
		var top    = Math.floor(y0 / this.tileHeight);
		var right  = Math.ceil((x0 + w) / this.tileWidth);
		var bottom = Math.ceil((y0 + h) / this.tileHeight);

		for (var x = left; x < right; x++) {
			for (var y = top; y < bottom; y++) {
				tiles.push(this.getTile(x, y));
			}
		}
		return tiles;
	},

	setVisibleTiles: function (newTiles) {
		var oldTiles = this.getVisibleTiles();
		this.visibleTiles = newTiles;
		oldTiles.subtract(newTiles).forEach(Tile.hide);
		newTiles.subtract(oldTiles).forEach(Tile.show);
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
		var tiles = this.getTilesInRect(x, y, w, h);
		tiles.forEach(function (tile) {
			tile.ctx.clearRect(x - tile.offsetX, y - tile.offsetY, w, h);
		});
	}
};

// MazeViewer

function MazeViewer(opt) {
	this.bindMethods(this.onResize, this.onMouseDown,
		this.onMouseMove, this.onMouseUp, this.onTouchStart, this.onTouchMove,
		this.onTouchEnd, this.possibleDirections);

	this.element = document.createElement("div");
	this.element.className = "layer maze";

	this.centerer = document.createElement("div");
	this.centerer.className = "layer centerer";
	this.element.appendChild(this.centerer);

	this.pathfinder = new Pathfinder({
		possibleDirections: this.possibleDirections,
		maxExtraLength: this.correctionAmount
	});

	var options = opt || {};
	if (options.loader) {
		this.loader = options.loader;
		this.tileSize = this.loader.getTileSize();
		this.startPos = this.startScrollPos = this.loader.getStartPos();
	}
	if (options.container) options.container.appendChild(this.element);
	var context = options.context;
	if (options.startPos) this.startPos = options.startPos;
	if (options.startScrollPos) this.startScrollPos = options.startScrollPos;

	this.mazeCanvas = new TiledCanvas(this.tileSize[0], this.tileSize[1]);
	this.mazeCanvas.initTile = this.initMazeTile.bind(this);
	this.scroller = new Scroller({
		container: this.element,
		contents: this.centerer,
		dragToScroll: true,
		scrollContents: true,
		start: [-this.startScrollPos[0], -this.startScrollPos[1]],
		onScroll: this.updateViewport.bind(this)
	});
	this.centerer.appendChild(this.mazeCanvas.element);

	// Create player marker, but don't add it until we enter the maze.
	this.playerMarker = document.createElement("div");
	this.playerMarker.className = "player-marker";

	//this.setPosition(this.startPos[0], this.startPos[1]);
	// Avoid race conditions by only using the base setPosition method here,
	// and by doing it before onMove is set.
	MazeViewer.prototype.setPosition.apply(this, this.startPos);

	if (options.onScroll) this._onScroll = options.onScroll.bind(context);
	if (options.onMove) this._onMove = options.onMove.bind(context);

	this.showStartMarker();

	//this.updateViewport();
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
	mouseX: NaN, // mouse coords
	mouseY: NaN,
	offsetX: NaN, // for mouse handling
	offsetY: NaN,
	playerMarker: null, //div
	tileSize: [256, 256],
	startPos: [127, 127], // player position
	startScrollPos: [127, 127], // viewport position
	inViewMode: true,
	pathColor: "#0f0",
	loader: null, // MazeLoader, for saving and getting tiles
	moving: false, // whether a scroll move is in progress

	// Amount of pixels by which the pathfinding algorithm may deviate
	// from a straight line.
	correctionAmount: 5,

	// listeners, overridden by instance options
	_onScroll: function (x, y) {},
	_onMove: function (x, y) {},

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
			this.loader.loadTile(tile, tileSrc);
		}
		// add creator info, and other stuff
		var tileInfo = this.loader.getTileInfo(x, y);
		if (tileInfo) {
			tile.info = tileInfo;
		}
	},

	resetMazeTile: function (tile, x, y) {
		// If the tile is in view, reload it.
		if (this.mazeCanvas.getVisibleTiles().contains(tile)) {
			this.initMazeTile(tile, x, y);
		} else {
			// otherwise empty it and reload it when it comes into view.
			tile.clear();
			// this is hackish.
			// todo: mark the tile as old.
			var self = this;
			var prevTileShow = tile.show;
			tile.show = function () {
				prevTileShow.call(this);
				this.show = prevTileShow;
				self.initMazeTile(tile, x, y);
			};
		}
	},

	showStartMarker: function () {
		var marker = this.startPosMarker = new Marker({
			x: this.startPos[0],
			y: this.startPos[1]
		});
		marker.element.addEventListener("mouseover",
			this.enterMaze.bind(this), false);
		if (supportsTouch) {
			marker.element.addEventListener("touchmove",
			function (e) {
				// prevent the mouseover event from firing
				e.preventDefault();
				this.enterMaze();
				this.onTouchStart(e);
			}.bind(this), false);
		}
		this.centerer.appendChild(marker.element);
	},

	onResize: function () {
		this.updateViewport();
	},

	enterMaze: function (fast) {
		if (this.entered) return false;
		this.entered = true;

		addClass(this.centerer, "in");

		// hide start marker
		var remove = function () {
			this.centerer.removeChild(this.startPosMarker.element);
			delete this.startPosMarker;
		}.bind(this);
		if (fast) {
			remove();
		} else {
			Transition(this.startPosMarker.element, {opacity: 0}, 250, remove);
		}

		this.overlay = new TiledCanvas(256, 256);
		this.overlay.element.style.opacity = 0.6;
		this.centerer.appendChild(this.overlay.element);

		this.updateOffset();
		this.centerer.addEventListener("mousedown", this.onMouseDown, false);
		this.centerer.addEventListener("mousemove", this.onMouseMove, false);
		if (supportsTouch) {
			this.centerer.addEventListener("touchstart",
				this.onTouchStart, false);
		}

		// add player marker (red dot)
		this.centerer.appendChild(this.playerMarker);

		this.updateViewport();
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
		e.preventDefault();
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
			this.scroller.move(
				0 - prevPageX + this.pageX,
				0 - prevPageY + this.pageY
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
			x += el.offsetLeft - el.scrollLeft;
			y += el.offsetTop - el.scrollTop;
		}
		this.offsetX = x;
		this.offsetY = y;
	},

	onMouseMove: function (e) {
		if (!e.pageX && !e.pageY) return;
		this.mouseX = e.pageX - this.offsetX;
		this.mouseY = e.pageY - this.offsetY;
		if (this.inViewMode) {
			this.moveToPixel(this.mouseX, this.mouseY);
		}
	},

	onMouseDown: function (e) {
		this.updateOffset();
		e.preventDefault();
		addClass(this.centerer, 'moving'); // change cursor
		this.centerer.removeEventListener("mousemove", this.onMouseMove, false);
		document.addEventListener("mouseup", this.onMouseUp, false);
	},

	onMouseUp: function (e) {
		this.updateOffset();
		removeClass(this.centerer, 'moving');
		this.centerer.addEventListener("mousemove", this.onMouseMove, false);
		document.removeEventListener("mouseup", this.onMouseUp, false);
		//this.updateViewport();
	},

	scrollTo: function (x, y, slow) {
		this.scroller.moveTo(x, y, slow);
		if (slow) {
			this.updateViewport(-x, -y, slow);
		} else {
			this.updateOffset();
		}
	},

	updateViewport: function (x, y, slow) {
		this.updateOffset();
		var mazeCanvas = this.mazeCanvas;
		var parent = this.centerer.offsetParent; //this.container
		if (!parent) {
			mazeCanvas.setVisibleTiles([]);
			return;
		}
		var x = -(x || this.scroller.x);
		var y = -(y || this.scroller.y);
		var width = parent.offsetWidth;
		var height = parent.offsetHeight;
		var oldTiles = mazeCanvas.getVisibleTiles();
		var newTiles = mazeCanvas.getTilesInRect(
			x - width / 2, //-c.offsetLeft,
			y - height / 2, //-c.offsetTop,
			width, //this.container.offsetWidth - c.offsetLeft,
			height //this.container.offsetHeight - c.offsetTop
		);
		if (slow) {
			// Transition move
			var combinedTiles = [].concat(oldTiles, newTiles);
			mazeCanvas.setVisibleTiles(combinedTiles);
			var self = this;
			if (this.moving) {
				clearTimeout(this.moving);
			}
			this.moving = setTimeout(function () {
				mazeCanvas.setVisibleTiles(newTiles);
				self.updateOffset();
			}, 500);
			this._onScroll(x, y);
		} else {
			mazeCanvas.setVisibleTiles(newTiles);
			this._onScroll(x, y);
		}
	},

	// directly set the player's position.
	setPosition: function (x, y) {
		this.x = x;
		this.y = y;

		this.playerMarker.style.left = x + "px";
		this.playerMarker.style.top = y + "px";

		this._onMove(x, y);
	},

	// move toward a pixel
	moveToPixel: function (xTo, yTo) {
		var route = this.pathfinder.findRoute([this.x, this.y], [xTo, yTo]);
		this.setPosition(route.point[0], route.point[1]);
		while (route) {
			var prev = route.from;
			if (prev) {
				this.overlay.drawLine(prev.point, route.point, this.pathColor);
			}
			route = prev;
		}
	},

	// get passable neighboring points
	isColorPassable: function (r, g, b, a) {
		var fg = (r + g + b) * a;
		// change 0 to 765 for passable bg
		var bg = 0 * (255 - a);
		return fg + bg > 70000; //97537 = 50%;
	},

	// get passable neighboring points
	possibleDirections: function (from) {
		var x = from[0];
		var y = from[1];
		var data = this.mazeCanvas.getImageData(x - 1, y - 1, 3, 3).data;

		var isColorPassable = this.isColorPassable;
		function pointIfPassable(dx, dy) {
			var i = 4 * (dy * 3 + dx);
			if (isColorPassable(data[i++], data[i++], data[i++], data[i])) {
				return [x + dx - 1, y + dy - 1];
			}
		}

		var n = pointIfPassable(1, 0);
		var s = pointIfPassable(1, 2);
		var w = pointIfPassable(0, 1);
		var e = pointIfPassable(2, 1);
		var ne = (n || e) && pointIfPassable(2, 0);
		var se = (s || e) && pointIfPassable(2, 2);
		var sw = (s || w) && pointIfPassable(0, 2);
		var nw = (n || w) && pointIfPassable(0, 0);
		return [n, s, e, w, ne, se, sw, nw].filter(Boolean);
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
	},

	loadTile: function (tile, src) {
		tile.loadImageSrc(src);
	}
});
