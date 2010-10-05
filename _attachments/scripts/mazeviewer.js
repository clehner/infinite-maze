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
	this.ctx.strokeStyle = "#0f0";
	this.ctx.lineCap = this.ctx.lineJoin = "round";
}
Tile.prototype = {
	offsetX: NaN,
	offsetY: NaN,
	element: null,
	ctx: null,
	isEmpty: true,
	
	drawLine: function (x1, y1, x2, y2) {
		var ctx = this.ctx;
		ctx.beginPath();
		ctx.moveTo(x1 - this.offsetX, y1 - this.offsetY);
		ctx.lineTo(x2 - this.offsetX, y2 - this.offsetY);
		ctx.stroke();
	},
	
	drawImage: function (img) {
		if (this.isEmpty) {
			this.isEmpty = false;
		}
		this.ctx.drawImage(img, 0, 0);
	},
	
	empty: function () {
		this.isEmpty = true;
	},
	
	hide: function () {
		this.element.style.display = "none";
	},
	
	show: function () {
		this.element.style.display = "";
	},
	
	toString: function () {
		return "[Tile " + this.offsetX + "," + this.offsetY + "]";
	}
};
Tile.hide = Tile.prototype.hide.unbind();
Tile.show = Tile.prototype.show.unbind();

// TiledCanvas

function TiledCanvas(tileWidth, tileHeight) {
	this.tileWidth = +tileWidth;
	this.tileHeight = +tileHeight;
	this.tiles = [];
	this.element = document.createElement("div");
	this.element.className = "layer";
	//this.element.style.position = "absolute";
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
		var row = this.tiles[y] || (this.tiles[y] = []);
		if (x in row) {
			return row[x];
		}
		var tile = row[x] = new Tile(x, y, this.tileWidth, this.tileHeight);
		this.initTile(tile, x, y);
		this.element.appendChild(tile.element);
		return tile;
	},
	
	drawLine: function (x0, y0, x1, y1) {
		var w = this.tileWidth;
		var h = this.tileHeight;
		var self = this;
		line(x0 / w, y0 / h, x1 / w, y1 / h, function (x, y) {
			self.getTile(x, y).drawLine(x0, y0, x1, y1);
		});
	},
	
	/*getPassableNeighboringPixels: function (x, y, z) {
		var tile = this.getTileAtPixel(x, y);
		var data = tile.ctx.getImageData(
			x - tile.offsetX - 1, y - tile.offsetY - 1, 3, 3).data;
		var pixels = [];
		if (this.isPixelDataPassable(data, 1, z)) pixels.push([x, y - 1]);
		if (this.isPixelDataPassable(data, 3, z)) pixels.push([x - 1, y]);
		if (this.isPixelDataPassable(data, 5, z)) pixels.push([x + 1, y]);
		if (this.isPixelDataPassable(data, 7, z)) pixels.push([x, y + 1]);
		return pixels;
	},*/
	
	getPixelValue: function (x, y) {
		var tile = this.getTileAtPixel(x, y);
		return tile.ctx.getImageData(
			x - tile.offsetX, y - tile.offsetY, 1, 1).data;
	},
	
	isPixelPassable: function (x, y) {
		var pixel = this.getPixelValue(x, y);
		var fg = (pixel[0] + pixel[1] + pixel[2]) * pixel[3];
		// change 0 to 765 for passable bg
		var bg = 0 * (255 - pixel[3]);
		return fg + bg > 97537;
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
	}
};

// MazeViewer

function MazeViewer(options) {
	this.bindMethods(this.onResize, this.onMouseDown, this.onMouseDrag,
		this.onMouseMove, this.onMouseUp, this.onTouchStart, this.onTouchMove,
		this.onTouchEnd);

	this.element = document.createElement("div");
	this.element.className = "layer maze";
	
	this.centerer = document.createElement("div");
	this.centerer.className = "layer centerer";
	this.element.appendChild(this.centerer);
	
	if (options) {
		if (options.tileSize) this.tileSize = options.tileSize;
		if (options.startPos) this.startPos = options.startPos;
		if (options.getTileSrc) this.getTileSrc = options.getTileSrc;
		if (options.container) container.appendChild(this.element);
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
	this.showHelpWindow();
	
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
	overlay: null, // TiledCanvas
	x: NaN, // player coords
	y: NaN,
	offsetX: NaN, // for mouse handling
	offsetY: NaN,
	centerX: NaN, // viewport position
	centerY: NaN,
	playerMarker: HTMLDivElement,
	tileSize: [256, 256],
	startPos: [127, 127],
	
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
	
	// override in instances or subclasses
	getTileSrc: function (x, y) {},
	
	initMazeTile: function (tile, x, y) {
		var tileSrc = this.getTileSrc(x, y);
		if (tileSrc) {
			var img = new Image();
			img.onload = tile.drawImage.bind(tile, img);
			img.onerror = tile.empty.bind(tile);
			img.src = tileSrc;
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
		
		addClass(this.element, "in");
		
		// hide start marker
		var self = this;
		Transition(this.startPosMarker.element, {opacity: 0}, 250, function () {
			self.centerer.removeChild(self.startPosMarker.element);
			delete self.startPosMarker;
		});
		
		
		this.hideHelpWindow();
		
		this.overlay = new TiledCanvas(256, 256);
		this.centerer.appendChild(this.overlay.element);
		
		if (supportsTouch) {
			this.element.addEventListener("touchstart",
				this.onTouchStart, false);
		} else {
			this.updateOffset();
			this.element.addEventListener("mousedown", this.onMouseDown, false);
			this.element.addEventListener("mousemove", this.onMouseMove, false);
		}
		
		// add player marker (red dot)
		this.centerer.appendChild(this.playerMarker);
	},
	
	onTouchStart: function (e) {
		// only deal with first finger.
		if (e.targetTouches.length != 1) return false;
		
		document.addEventListener("touchmove", this.onTouchMove, false);
		document.addEventListener("touchend", this.onTouchEnd, false);
		
		this.updateOffset();
		this.onTouchMove(e);
	},
	
	onTouchMove: function (e) {
		e.preventDefault();
		this.moveToPixel(
			e.touches[0].pageX - this.offsetX,
			e.touches[0].pageY - this.offsetY
		);
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
		this.moveToPixel(
			e.pageX - this.offsetX,
			e.pageY - this.offsetY
		);
	},
	
	onMouseDown: function (e) {
		this.prevPageX = e.pageX;
		this.prevPageY = e.pageY;
		e.preventDefault();
		this.element.className += ' moving'; // changes cursor
		this.element.removeEventListener("mousemove", this.onMouseMove, false);
		document.addEventListener("mousemove", this.onMouseDrag, false);
		document.addEventListener("mouseup", this.onMouseUp, false);
	},
	
	onMouseUp: function (e) {
		this.updateOffset();
		removeClass(this.element, 'moving');
		this.element.addEventListener("mousemove", this.onMouseMove, false);
		document.removeEventListener("mousemove", this.onMouseDrag, false);
		document.removeEventListener("mouseup", this.onMouseUp, false);
		//this.updateViewport();
	},
	
	onMouseDrag: function (e) {
		this.centerX += this.prevPageX - e.pageX;
		this.centerY += this.prevPageY - e.pageY;
		this.prevPageX = e.pageX;
		this.prevPageY = e.pageY;
		this.updateViewport();
	},
	
	updateViewport: function (transition) {
		var mazeCanvas = this.mazeCanvas;
		var parent = this.element.offsetParent; //this.container
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
	
	// directly set the position.
	setPosition: function (x, y) {
		this.x = x;
		this.y = y;
		
		this.playerMarker.style.left = x + "px";
		this.playerMarker.style.top = y + "px";
	},
	
	// move toward a pixel
	moveToPixel: function (xTo, yTo) {
		var xStart = this.x;
		var yStart = this.y;
		var xEnd, yEnd;
		if (xTo == xStart && yTo == yStart) { return; }
		
		var self = this;
		var mazeCanvas = this.mazeCanvas;
		line(xStart, yStart, xTo, yTo, function (x, y) {
			if (mazeCanvas.isPixelPassable(x, y)) {
				xEnd = x;
				yEnd = y;
			} else {
				return false;
			}
		});
		
		//console.log(xStart, yStart, xTo, yTo);
		
		this.setPosition(xEnd, yEnd);
		
		this.overlay.drawLine(xStart, yStart, xEnd, yEnd);
		
		//this.onResize();
	}
};
