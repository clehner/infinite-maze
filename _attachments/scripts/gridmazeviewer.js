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
		this.hoverTile(this.mazeCanvas.getTileAtPixel(x, y));
		MazeViewer.prototype.moveToPixel.call(this, x, y);
	},
	onHitEdge: function (x, y) {
		var tile = this.mazeCanvas.getTileAtPixel(x, y);
		if (tile.isEmpty) {
			// The user is trying to enter an empty (probably uncreated) tile.
			// Give them the option to draw the tile.
			this.showTileHighlight(tile, this.tileHighlights.drawHere);
		}
	},
	hoverTile: function (tile) {
		var highlight = tile.isEmpty ? this.tileHighlights.getHere :
			this.tileHighlights.blank;
		this.showTileHighlight(tile, highlight);
	},
	tileHighlights: {
		blank: "",
		drawHere: "Draw this square!",
		getHere: "If you can get to this square, you can draw it."
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
	child.innerHTML = message;
	el.appendChild(child);
}