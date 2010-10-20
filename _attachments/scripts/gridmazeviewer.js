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

var DrawingTileBox = Classy(TileBox, {
	constructor: function () {
		TileBox.apply(this, arguments);
		addClass(this.element, "drawing");
	}
});


var GridMazeViewer = Classy(MazeViewer, {

	// Tile boxes show borders and information over the maze grid squares.
	// The "draw here" tile box includes a button that the user can click to
	// go to drawing mode and draw the tile.
	emptyTileBox: null,
	getHereTileBox: null,
	drawHereTileBox: null,
	
	// a tile in draw mode
	drawingTile: null,
	
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
		if (this.drawingTile == tile) return;
		this.drawingTile = tile;
		this.isInViewMode = false;
		
		// turn off the cross-hairs cursor outside this tile.
		removeClass(this.centerer, "in");
		
		// the pixel leading into this cell.
		var outerEntrancePixel = [this.x, this.y];
		
		//alert('Coming soon!');
		
		this.hideTileBoxes();
		
		var editor = this.editor = new GridMazeTileEditor(this, tile);
		/* .element! */
		this.element.appendChild(editor.element);
		
		Transition(editor.element, {bottom: "-120px"}, 500);
		Transition(this.element, {bottom: "120px"}, 500, function () {
			// adjust center. todo: get rid of jerk
			this.centerY -= 60;
			this.updateViewport();
		}.bind(this));
	},
	
	exitDrawTileMode: function () {
		if (!this.drawingTile) return;
		this.drawingTile = null;
		this.isInViewMode = true;
		addClass(this.centerer, "in");
		
		Transition(this.editor.element, {bottom: "0px"}, 500);
		Transition(this.element, {bottom: "0px"}, 500, function () {
			// adjust center. todo: get rid of jerk
			this.centerY += 60;
			this.updateViewport();
			this.element.removeChild(this.editor.element);
		}.bind(this));
	},
	
	publishTileDrawing: function (tile, tileCoords, onError, onSuccess) {
		//return onSuccess();
		this.loader.saveTileDrawing(tile, tileCoords,
			function (status, error, reason) {
				console.log(status, error, reason);
				onError([status, error, reason]);
			},
			function (resp) {
				console.log('success!');
				onSuccess(resp);
			}
		);
	}
});

var Picker = Classy(Box, {
	tagName: "table",
	
	data: [], // rows/cells
	selectedCell: null,
	initCell: function () {}, // override
	onSelect: null, // override
	
	constructor: function (data) {
		Box.call(this);
		var self = this;
		var table = this.element;
		addClass(table, "picker");
		table.addEventListener("click", this.onClick.bind(this), false);
		this.data = data;
		data.forEach(function (dataRow, i) {
			var row = table.insertRow(i);
			dataRow.forEach(function (value, j) {
				var cell = row.insertCell(j);
				cell.row = i;
				cell.col = j;
				self.initCell(cell, value);
			});
		});
		this.selectCoord(0, 0);
	},
	
	onClick: function (e) {
		if (e.target.nodeName == "TD") {
			this.selectCell(e.target);
		} else if (e.target.parentNode.nodeName == "TD") {
			this.selectCell(e.target.parentNode);
		}
	},
	
	selectCell: function (cell) {
		if (this.selectedCell) removeClass(this.selectedCell, "selected");
		this.selectedCell = cell;
		addClass(cell, "selected");
		var value = this.data[cell.row][cell.col];
		if (this.onSelect) this.onSelect(value);
	},
	
	selectCoord: function (row, col) {
		this.selectCell(this.element.rows[row].cells[col]);
	}
});

var ColorPicker = Classy(Picker, {
	constructor: function (colors) {
		Picker.call(this, colors);
		this.element.id = "color-picker";
	},
	
	initCell: function (cell, color) {
		cell.style.backgroundColor = color;
	}
});

var SizePicker = Classy(Picker, {
	constructor: function (sizes) {
		Picker.call(this, [sizes]);
		this.element.id = "size-picker";
	},
	
	initCell: function (cell, size) {
		var circle = document.createElement("div");
		circle.className = "circle";
		var s = circle.style;
		s.width = s.height = size + "px";
		s.borderRadius = s.MozBorderRadius = s.WebkitBorderRadius = size/2+"px";
		cell.appendChild(circle);
	},
	
	select: function (x) {
		this.selectCoord(0, x);
	}
});


var GridMazeTileEditor = Classy(Box, {
	maze: null,
	tile: null,
	tileCoords: null,
	tileCtx: null,
	tileBox: null,
	
	rules: "<div id=\"rules\">" +
		"<h3>Maze Rules</h3>" +
		"You must allow a path from the entrance point of the square to go to at least two adjacent empty squares, if possible." +
		"</div>",
	
	colors: ["#000,#5e320b,#900000,#006000,#0000f0".split(","),
		"#fff,#fffa53,#ffd1f0,#8ffa8e,#80e9fd".split(",")],
	pencilSizes: [18, 13, 8, 4, 1],
	
	constructor: function (maze, tile) {
		Box.call(this);

		this.maze = maze;
		this.tile = tile;
		this.tileCtx = tile.ctx;
		this.tileCoords = maze.mazeCanvas.getTileCoords(tile);
		tile.isEmpty = false;
		
		// Create a tile box.
		this.tileBox = new DrawingTileBox(maze);
		maze.centerer.appendChild(this.tileBox.element);		this.tileBox.coverTile(tile);
		
		// Mouse behavior
		new DragBehavior({
			element: this.tileBox.element,
			onDragStart: this.onDragStart,
			onDrag: this.onDrag,
			onDragEnd: null,
			context: this
		});
		
		// Set up the editor toolbox.
		this.element.id = "editor-toolbox";
		this.element.innerHTML = this.rules;
		
		var div = document.createElement("div");
		div.id = "toolbox-palettes";
		this.element.appendChild(div);
			
		// Add the color picker.
		var colorPicker = new ColorPicker(this.colors);
		colorPicker.onSelect = this.setPencilColor.bind(this);
		colorPicker.selectCoord(1, 0);
		div.appendChild(colorPicker.element);
		
		var sizePicker = new SizePicker(this.pencilSizes);
		sizePicker.onSelect = this.setPencilSize.bind(this);
		sizePicker.select(0);
		div.appendChild(sizePicker.element);
		
		var saveButton = document.createElement("button");
		saveButton.innerHTML = "Save";
		saveButton.onclick = this.save.bind(this);
		div.appendChild(saveButton);
		
		var discardButton = document.createElement("button");
		discardButton.innerHTML = "Discard";
		discardButton.onclick = this.discard.bind(this);
		div.appendChild(discardButton);
		
		var msg = "Your drawing won't actually be saved for good in this version. Come back in a week or two!";
		var sorry = document.createElement("div");
		sorry.id = "sorry-message";
		sorry.innerHTML = msg;
		this.element.appendChild(sorry);
	},
	
	setPencilColor: function (color) {
		this.tileCtx.strokeStyle = color;
	},
	
	setPencilSize: function (size) {
		this.tileCtx.lineWidth = +size;
	},
	
	onDragStart: function (e) {
		this.x = e._x;
		this.y = e._y;
		this.onDrag(e);
	},
	
	onDrag: function (e) {
		var offset = 0; // 0.5
		var ctx = this.tileCtx;
		ctx.beginPath();
		ctx.moveTo(this.x + offset, this.y + offset);
		this.x = e._x;
		this.y = e._y;
		ctx.lineTo(this.x + offset, this.y + offset);
		ctx.stroke();
		
		// Stop dragging the tile
		e.stopPropagation();
	},
	
	exit: function () {
		this.maze.centerer.removeChild(this.tileBox.element);
		this.maze.exitDrawTileMode();
	},
	
	checkRules: function () {
		// TODO
		return true;
	},
	
	save: function () {
		if (!confirm("Are you sure you are ready to save?")) return;
		if (!this.checkRules()) {
			alert("You haven't followed all the rules! Fix your drawing and try again.");
			return;
		}
		var self = this;
		this.maze.publishTileDrawing(this.tile, this.tileCoords,
			function onError(msg) {
				alert("There was an error: " + msg);
			},
			function onSuccess() {
				self.exit();
			}
		);
	},
	
	discard: function () {
		if (!confirm("You really want to discard your drawing?")) return;
		this.tile.clear();
		this.exit();
	}
});

var InfiniteMazeLoader = Classy(MazeLoader, {
	tilesInfo: null,
	
	constructor: function (db, doc, tiles) {
		MazeLoader.call(this, db, doc);
		this.tilesInfo = tiles;
	},
	
	getTileSrc: function (x, y) {
		var tileId = (this.tilesInfo[x] || {})[y];
		if (tileId) {
			return this.getDocAttachmentsPath(tileId) + 'tile.png';
		}
	},

	saveTileDrawing: function (tile, tileCoords, onError, onSuccess) {
		this.db.saveDoc({
			_id: Couch.newUUID(), // make this async?
			creator: "cel",
			created_at: Date.now(),
			type: "tile",
			maze_id: this.mazeId,
			location: tileCoords,
			
			_attachments: {
				"tile.png": {
					content_type: "image/png",
					data: tile.exportPNG()
				}
			}
		}, {
			error: onError,
			success: onSuccess
		});
	}
});