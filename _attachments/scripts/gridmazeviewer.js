var Box = Classy({
	element: null,
	tagName: "div",
	visible: true,
	
	constructor: function () {
		this.element = document.createElement(this.tagName);
	},
	
	hide: function () {
		if (this.visible) {
			this.visible = false;
			addClass(this.element, "hidden");
		}
	},
	
	show: function () {
		if (!this.visible) {
			this.visible = true;
			removeClass(this.element, "hidden");
		}
	}
});

// A tile box is used to overlay a tile with a border and some html.
var TileBox = Classy(Box, {
	maze: null,
	tile: null,
	child: null,
	
	constructor: function (maze) {
		Box.call(this);
		this.maze = maze;
		addClass(this.element, "tile-box");
		this.child = document.createElement("div");
		this.element.appendChild(this.child);
	},
	
	// move the tile box to a tile's position
	coverTile: function (tile) {
		this.show();
		var s1 = this.element.style;
		var s2 = tile.element.style;
		s1.left   = s2.left;
		s1.top    = s2.top;
		s1.width  = s2.width;
		s1.height = s2.height;
		this.tile = tile;
	}
});

var EmptyTileBox = Classy(TileBox, {
	constructor: function () {
		TileBox.apply(this, arguments);
		addClass(this.element, "empty");
	}
});

var DrawHereTileBox = Classy(TileBox, {
	constructor: function () {
		TileBox.apply(this, arguments);
		addClass(this.element, "draw-here");
		this.child.innerHTML =
			"<p>Now that you have made it to this square, " +
			"you can draw in it!</p>";
		var button = document.createElement("button");
		button.innerHTML = "Draw";
		button.onclick = this.onButtonClick.bind(this);
		this.child.appendChild(button);
	},
	onButtonClick: function () {
		this.maze.enterDrawTileMode(this.tile);
	}
});

var GetHereTileBox = Classy(TileBox, {
	constructor: function () {
		TileBox.apply(this, arguments);
		addClass(this.element, "get-here");
		this.child.innerHTML =
			"If you can get to this square, you can draw it.";
	}
});


var GridMazeViewer = Classy(MazeViewer, {

	// Tile boxes show borders and information over the maze grid squares.
	// The "draw here" tile box includes a button that the user can click to
	// go to drawing mode and draw the tile.
	emptyTileBox: null,
	getHereTileBox: null,
	drawHereTileBox: null,
	
	constructor: function (options) {
		MazeViewer.call(this, options);
		
		// initialize tile boxes.
		this.emptyTileBox = new EmptyTileBox(this);
		this.centerer.appendChild(this.emptyTileBox.element);
		
		this.getHereTileBox = new GetHereTileBox(this);
		this.centerer.appendChild(this.getHereTileBox.element);
		
		this.drawHereTileBox = new DrawHereTileBox(this);
		this.centerer.appendChild(this.drawHereTileBox.element);
		
		this.hideTileBoxes();
	},
	
	moveToPixel: function (x, y) {
		this.hideTileBoxes();
		var tile = this.mazeCanvas.getTileAtPixel(x, y);
		this.onTileMouseOver(tile);
		MazeViewer.prototype.moveToPixel.call(this, x, y);
	},
	
	setPosition: function (x, y) {
		// Highlight tile adjacent to the current location, if the current
		// location is on its border.
		var mazeCanvas = this.mazeCanvas;
		var currentTile = mazeCanvas.getTileAtPixel(x, y);
		var tileWidth = this.tileSize[0];
		var tileHeight = this.tileSize[1];
		var xInTile = x % tileWidth;
		var yInTile = y % tileHeight;
		
		// Find any adjacent tiles, and hover them.
		var tileBox = this.drawHereTileBox;
		if (xInTile == 0) {
			this.onTileAdjacent(mazeCanvas.getTileAtPixel(x - tileWidth, y));
		} else if (xInTile == tileWidth - 1) {
			this.onTileAdjacent(mazeCanvas.getTileAtPixel(x + tileWidth, y));
		}
		if (yInTile == 0) {
			this.onTileAdjacent(mazeCanvas.getTileAtPixel(x, y - tileHeight));
		} else if (yInTile == tileHeight - 1) {
			this.onTileAdjacent(mazeCanvas.getTileAtPixel(x, y + tileHeight));
		}
		
		MazeViewer.prototype.setPosition.call(this, x, y);
	},
	
	// called when the player's location is one pixel away from an adjacent tile
	onTileAdjacent: function (tile) {
		if (tile.isEmpty) {
			var box = this.drawHereTileBox;
			box.coverTile(tile);
			
			// hide any other tile boxes covering this tile.
			if (this.getHereTileBox.tile == tile) {
				this.getHereTileBox.hide();
			}
			if (this.emptyTileBox.tile == tile) {
				this.emptyTileBox.hide();
			}
		}
	},
	
	// called on mouseover of a tile
	onTileMouseOver: function (tile) {
		var tileBox = tile.isEmpty ? this.getHereTileBox : this.emptyTileBox;
		tileBox.coverTile(tile);
	},
	
	hideTileBoxes: function () {
		this.emptyTileBox.hide();
		this.getHereTileBox.hide();
		this.drawHereTileBox.hide();
	},
	
	// the user has decided to draw this tile. enter tile drawing mode.
	enterDrawTileMode: function (tile) {
		console.log('drawing tile at', this.mazeCanvas.getTileCoords(tile));
		alert('Coming soon!');
	},
});
