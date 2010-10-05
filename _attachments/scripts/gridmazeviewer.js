GridMazeViewer = Classy(MazeViewer, {

	// borders and messages overlayed over tiles
	tileHighlightsLayer: null,
	
	// keep track of which tiles are highlighted
	tileHighlightsVisible: null,
	
	constructor: function (options) {
		MazeViewer.call(this, options);
		this.tileHighlightsLayer = document.createElement("div");
		this.centerer.appendChild(this.tileHighlightsLayer);
		this.tileHighlightsVisible = {};
	},
	moveToPixel: function (x, y) {
		this.hideTileHighlights();
		// Highlight the tile under the mouse
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
		if (xInTile == 0) {
			this.showCanDrawTile(mazeCanvas.getTileAtPixel(x - tileWidth, y));
		} else if (xInTile == tileWidth - 1) {
			this.showCanDrawTile(mazeCanvas.getTileAtPixel(x + tileWidth, y));
		}
		if (yInTile == 0) {
			this.showCanDrawTile(mazeCanvas.getTileAtPixel(x, y - tileHeight));
		} else if (yInTile == tileHeight - 1) {
			this.showCanDrawTile(mazeCanvas.getTileAtPixel(x, y + tileHeight));
		}
		
		MazeViewer.prototype.setPosition.call(this, x, y);
	},
	onTileMouseOver: function (tile) {
		var highlight = tile.isEmpty ? this.tileHighlights.getHere :
			this.tileHighlights.blank;
		this.showTileHighlight(tile, highlight);
	}, 
	showCanDrawTile: function (tile) {
		if (tile.isEmpty) {
			this.showTileHighlight(tile, this.tileHighlights.drawHere);
		}
	},
	tileHighlights: {
		blank: "",
		drawHere: {
			className: "draw-here",
			text: "Now that you have made it to this square, you can draw it!"
		},
		getHere: {
			className: "get-here",
			text: "If you can get to this square, you can draw it."
		}
	},
	showTileHighlight: function (tile, message) {
		var tileId = tile.toString();
		if (this.tileHasHighlight(tile)) {
			this.removeTileHighlight(tile);
		}
		var tileHighlight = new TileHighlight(tile, message);
		this.tileHighlightsLayer.appendChild(tileHighlight.element);
		this.tileHighlightsVisible[tileId] = tileHighlight;
	},
	tileHasHighlight: function (tile) {
		return tile.toString() in this.tileHighlightsVisible;
	},
	hideTileHighlights: function () {
		for (var i in this.tileHighlightsVisible) {
			this.removeTileHighlight(i);
		}
	},
	removeTileHighlight: function (tile) {
		var tileHighlight = this.tileHighlightsVisible[tile];
		this.tileHighlightsLayer.removeChild(tileHighlight.element);
		delete this.tileHighlightsVisible[tile];
	}
});

function TileHighlight(tile, message) {
	var el = this.element = document.createElement("div");
	el.className = "tile-highlight";
	el.style.left = tile.offsetX + "px";
	el.style.top = tile.offsetY + "px";
	el.style.width = tile.element.width + "px";
	el.style.height = tile.element.height + "px";
	var child = document.createElement("div");
	child.innerHTML = message.text || "";
	addClass(el, message.className);
	for (var property in message) {
		child[property] = message[property];
	}
	el.appendChild(child);
}