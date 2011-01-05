var Box = Classy({
	element: null,
	tagName: "div",
	visible: true,
	
	constructor: function () {
		if (this.element) {
			if (hasClass(this.element, "hidden")) {
				this.visible = false;
			}
		} else {
			this.element = document.createElement(this.tagName);
			if (!this.visible) {
				addClass(this.element, "hidden");
			}
		}
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

// Make a box object out of an element.
Box.ify = function (element /*, [args...] */) {
	var args = [clone(this.prototype)];
	args.push.apply(args, arguments);
	return Box.ificate.apply(this, args);
};

// Instantiate a box object with an element.
Box.ificate = function (obj, element /*, [args...] */) {
	obj.element = element;
	
	var ret = this.apply(obj, Array.prototype.slice.call(arguments, 2));
	return ret instanceof Object ? ret : obj;
};

// A tile box is used to overlay a tile with a border and some html.
var TileBox = Classy(Box, {
	maze: null,
	tile: null,
	inner: null,
	
	constructor: function (maze) {
		Box.call(this);
		this.maze = maze;
		addClass(this.element, "tile-box");
		this.inner = document.createElement("div");
		this.element.appendChild(this.inner);
		this.inner.className = "inner";
	},
	
	// move the tile box to a tile's position
	coverTile: function (tile) {
		if (this.tile == tile && this.visible) return;
		this.tile = tile;
		this.show();
		var s1 = this.element.style;
		var s2 = tile.element.style;
		s1.left   = s2.left;
		s1.top    = s2.top;
		s1.width  = s2.width;
		s1.height = s2.height;
	}
});

// placed over drawn tiles
var InfoTileBox = Classy(TileBox, {
	tileInfoEl: null,
	innerTileInfo: null,
	nameElement: null,
	nameText: null,
	editLink: null,
	claimLink: null,
	
	constructor: function () {
		TileBox.apply(this, arguments);
		addClass(this.element, "empty");
		
		var checkIfInWay = this.checkIfInWay.bind(this);
		
		var infoLeft = this.infoLeft = this.inner;
		infoLeft.className = "tile-info left";
		infoLeft.addEventListener("mouseover", checkIfInWay, false);
		infoLeft.addEventListener("mouseout", checkIfInWay, false);
		this.element.appendChild(infoLeft);
		
		var infoRight = this.infoRight = document.createElement("div");
		infoRight.className = "tile-info right";
		infoRight.addEventListener("mouseover", checkIfInWay, false);
		infoRight.addEventListener("mouseout", checkIfInWay, false);
		this.element.appendChild(infoRight);
		
		var nameElement = this.nameElement = document.createElement("span");
		nameElement.className = "name";
		infoLeft.appendChild(nameElement);
		var nameText = this.nameText = document.createTextNode("");
		nameElement.appendChild(nameText);
		
		var editLink = this.editLink = document.createElement("a");
		editLink.href = "";
		editLink.onclick = this.onEditLinkClick.bind(this);
		editLink.innerHTML = "Edit";
		infoRight.appendChild(document.createTextNode(" "));
		infoRight.appendChild(editLink);
		
		var claimLink = this.claimLink = document.createElement("a");
		claimLink.href = "";
		claimLink.onclick = this.onClaimLinkClick.bind(this);
		claimLink.innerHTML = "Claim";
		infoRight.appendChild(document.createTextNode(" "));
		infoRight.appendChild(claimLink);
		
		var fixLink = this.fixLink = document.createElement("a");
		fixLink.href = "";
		fixLink.onclick = this.onFixLinkClick.bind(this);
		fixLink.innerHTML = "Fix";
		infoRight.appendChild(document.createTextNode(" "));
		infoRight.appendChild(fixLink);
	},
	
	coverTile: function (tile) {
		TileBox.prototype.coverTile.call(this, tile);

		// put the creators name on the tile
		var name = tile.info.creator || "anonymous";
		this.nameText.nodeValue = name;
		this.nameElement.title = 'This maze square was drawn by "' + name + '"';
		
		// show or hide links
		var loader = InfiniteMaze.loader;
		
		var editable = loader.canEditTile(tile);
		var claimable = loader.canClaimTile(tile);
		var fixable = loader.canFixTile(tile);
		var anything = editable || claimable || fixable;
		toggleClass(this.editLink, "hidden", !editable);
		toggleClass(this.claimLink, "hidden", !claimable);
		toggleClass(this.fixLink, "hidden", !fixable);
		toggleClass(this.infoRight, "hidden", !anything);
	},
	
	// Hide info texts if they are in the way of the player.
	checkIfInWay: function () {
		var infoLeft = this.infoLeft;
		var infoRight = this.infoRight;
		var viewer = InfiniteMaze.viewer;
		var playerIsInThisTile = viewer.tileIn == this.tile;
		if (playerIsInThisTile) {
			var x = viewer.x - this.tile.offsetX;
			var y = viewer.y - this.tile.offsetY;
			if (y < infoLeft.offsetHeight + infoLeft.offsetTop) {
				var inWayLeft = x < infoLeft.offsetWidth;
				var inWayRight = x > infoRight.offsetLeft;
			}
		}
		toggleClass(infoLeft, "dim", inWayLeft);
		toggleClass(infoRight, "dim", inWayRight);
	},
	
	onEditLinkClick: function (e) {
		e.preventDefault();
		if (InfiniteMaze.loader.canEditTile(this.tile)) {
			InfiniteMaze.viewer.enterDrawTileMode(this.tile);
		}
	},
	
	onClaimLinkClick: function (e) {
		e.preventDefault();
		var loggedIn = InfiniteMaze.getUsername();
		if (loggedIn) {
			if (confirm("Did you draw this tile?")) {
				InfiniteMaze.claimer.claimTile(this.tile);
				this.tile.claimSubmitted = true;
				alert("Thank you. Your claim has been submitted.");
			}
		} else {
			if (confirm("Did you draw this tile? Log in to claim it.")) {
				InfiniteMaze.loginSignupWindow.show();
			}
		}
	},
	
	onFixLinkClick: function (e) {
		e.preventDefault();
		// let the user pick a location
		var useNearestEdge = true;
		//confirm("Pick a start point. Use nearest edge?");
		var tile = this.tile;
		this.element.addEventListener("mousedown", function pointPicked(e) {
			this.removeEventListener("mousedown", pointPicked, false);
			var x = InfiniteMaze.viewer.mouseX - tile.offsetX;
			var y = InfiniteMaze.viewer.mouseY - tile.offsetY;
			var point;
			if (useNearestEdge) {
				var distancesToEdges = [x, y, 256 - x, 256 - y];
				var nearestEdge = distancesToEdges.indexOf(
					Math.min.apply(Math, distancesToEdges));
				point = [
					[0, y],
					[x, 0],
					[256, y],
					[x, 256]
				][nearestEdge];
			} else {
				point = [x, y];
			}
			// tell the loader to set this tile's start point to that location.
			InfiniteMaze.loader.setTileStart(tile, point);
		}, false);
	}
});

// placed over empty tiles near adjacent to
var DrawHereTileBox = Classy(TileBox, {
	constructor: function () {
		TileBox.apply(this, arguments);
		addClass(this.element, "draw-here");
		this.inner.innerHTML =
			"<p>Now that you have made it to this square, " +
			"you can draw in it!</p>";
		var button = document.createElement("button");
		button.innerHTML = "Draw";
		button.onclick = this.onButtonClick.bind(this);
		this.inner.appendChild(button);
		
		// while hovering the draw-here box, freeze the player's position
		this.element.addEventListener("mouseover", this.freezePlayer.bind(this),
			false);
		
		// when the mouse leaves this box, allow the player to move again.
		this.element.addEventListener("mouseout", this.releasePlayer.bind(this),
			false);
	},
	
	onButtonClick: function () {
		this.maze.enterDrawTileMode(this.tile);
	},
	
	freezePlayer: function () {
		InfiniteMaze.viewer.inViewMode = false;
	},
	
	releasePlayer: function () {
		if (!InfiniteMaze.viewer.inEditMode) {
			InfiniteMaze.viewer.inViewMode = true;
		}
	}
});

// placed over empty tiles
var GetHereTileBox = Classy(TileBox, {
	constructor: function () {
		TileBox.apply(this, arguments);
		addClass(this.element, "get-here");
		this.inner.innerHTML =
			"If you can get to this square, you can draw it.";
	}
});

// placed over a tile being edited
var DrawingTileBox = Classy(TileBox, {
	cursor: null,
	constructor: function () {
		TileBox.apply(this, arguments);
		addClass(this.element, "drawing");
		
		var cursor = this.cursor = document.createElement("div");
		cursor.id = "drawing-cursor";
		
		this.element.addEventListener("mouseover", function () {
			document.body.appendChild(cursor);
		}, false);
		this.element.addEventListener("mouseout", function () {
			document.body.removeChild(cursor);
		}, false);
	}
});


var GridMazeViewer = Classy(MazeViewer, {

	inEditMode: false,

	// Tile boxes show borders and information over the maze grid squares.
	// The "draw here" tile box includes a button that the user can click to
	// go to drawing mode and draw the tile.
	infoTileBox: null,
	getHereTileBox: null,
	drawHereTileBox: null,
	
	// a tile in draw mode
	drawingTile: null,
	
	editor: null,
	youAreHereMarker: null,
	
	// what tile the player is in
	tileIn: null,
	
	constructor: function (options) {
		this.infoTileBox = new InfoTileBox(this);
		this.getHereTileBox = new GetHereTileBox(this);
		this.drawHereTileBox = new DrawHereTileBox(this);
		this.hideTileBoxes();
		this.youAreHereMarker = new YouAreHereMarker(this);

		MazeViewer.call(this, options);

		this.centerer.appendChild(this.infoTileBox.element);
		this.centerer.appendChild(this.getHereTileBox.element);
		this.centerer.appendChild(this.drawHereTileBox.element);
		this.centerer.appendChild(this.youAreHereMarker.element);
	},
	
	load: function () {
		MazeViewer.prototype.load.call(this);
		this.hideTileBoxes();
		this.enterMaze(true);
	},
	
	moveToPixel: function (x, y) {
		var tile = this.mazeCanvas.getTileAtPixel(x, y);
		this.onTileMouseOver(tile);
		MazeViewer.prototype.moveToPixel.call(this, x, y);
	},
	
	// set the player's position
	setPosition: function (x, y) {
		// Highlight tile adjacent to the current location, if the current
		// location is on its border.
		var tileWidth = this.tileSize[0];
		var tileHeight = this.tileSize[1];
		var xInTile = x % tileWidth;
		var yInTile = y % tileHeight;
		
		// Find any adjacent tiles, and hover them.
		if (xInTile == 0) {
			this._onTileAdjacent(x - tileWidth, y);
		} else if (xInTile == -1 || xInTile == tileWidth - 1) {
			this._onTileAdjacent(x + tileWidth, y);
			// todo: split these and allow multiple drawheretileboxes.
		} else if (yInTile == 0) {
			this._onTileAdjacent(x, y - tileHeight);
		} else if (yInTile == -1 || yInTile == tileHeight - 1) {
			this._onTileAdjacent(x, y + tileHeight);
		} else {
			this._onTileAdjacent(null);
		}
		
		MazeViewer.prototype.setPosition.call(this, x, y);
		
		// update what tile the player is in.
		var prevTileIn = this.tileIn;
		var tileIn = this.mazeCanvas.getTileAtPixel(x, y);
		if (tileIn != prevTileIn) {
			this.tileIn = tileIn;
			this.onTileEnter(tileIn, prevTileIn);
		}
		
		if (this.youAreHereMarker) {
			//this.youAreHereMarker.update();
		}
		
		this.infoTileBox.checkIfInWay();
	},
	
	// called when the player's location is one pixel away from an adjacent tile
	_onTileAdjacent: function (x, y) {
		if (x == null) {
			this.drawHereTileBox.hide();
			return;
		}
		var tile = this.mazeCanvas.getTileAtPixel(x, y);
		if (tile.isEmpty) {
			this.drawHereTileBox.coverTile(tile);
			
			// hide any other tile boxes covering this tile.
			if (this.getHereTileBox.tile == tile) {
				this.getHereTileBox.hide();
			}
			if (this.infoTileBox.tile == tile) {
				this.infoTileBox.hide();
			}
		}
	},
	
	// called when the player enters a new tile.
	onTileEnter: function (tileIn, tileOut) {
		tileIn.updateTeleporter();
		tileOut && tileOut.updateTeleporter();
	},
	
	// called on mouseover of a tile.
	onTileMouseOver: function (tile) {
		// Show the relevant tile box.
		if (tile.isEmpty) {
			this.getHereTileBox.coverTile(tile);
			this.infoTileBox.hide();
		} else {
			this.infoTileBox.coverTile(tile);
			this.getHereTileBox.hide();
		}
	},
	
	hideTileBoxes: function () {
		this.infoTileBox.hide();
		this.getHereTileBox.hide();
		this.drawHereTileBox.hide();
	},
	
	// the user has decided to draw this tile. enter tile drawing mode.
	enterDrawTileMode: function (tile) {
		if (this.drawingTile == tile) return;
		this.drawingTile = tile;
		this.inViewMode = false;
		this.inEditMode = true;
		
		// turn off the cross-hairs cursor outside this tile.
		removeClass(this.centerer, "in");
		
		// clear the path above this tile
		this.overlay.clearTile(tile);

		this.hideTileBoxes();
		
		// the pixel leading into this cell.
		var entrance = [this.x, this.y];
		
		// Open the editor toolbox.
		InfiniteMaze.editor.openForTile(tile, entrance);
	},
	
	exitDrawTileMode: function () {
		if (!this.drawingTile) return;
		this.drawingTile = null;
		this.inViewMode = true;
		this.inEditMode = false;
		addClass(this.centerer, "in");
	},
	
	// called on scroll
	updateViewport: function (x, y, slow) {
		MazeViewer.prototype.updateViewport.call(this, x, y, slow);
		
		if (this.youAreHereMarker) {
			this.youAreHereMarker.update();
		}
	},
	
	initMazeTile: (function () {
		// @this {Tile}
		function tileShow() {
			Tile.prototype.show.call(this);
			this.teleporter.update();
		}
		function tileHide() {
			Tile.prototype.hide.call(this);
			this.teleporter.hide();
		}
		function updateTeleporter() {
			//if (this.teleporter) {
				this.teleporter.update();
			//}
		}
		
		return function (tile, x, y) {
			MazeViewer.prototype.initMazeTile.call(this, tile, x, y);
			if (tile.info.start) {
				// remove old teleporter first, if exists
				if (tile.teleporter) {
					this.centerer.removeChild(tile.teleporter.element);
				}
				// add new teleporter
				var teleporter = tile.teleporter = new Teleporter(this, tile);
				setTimeout(teleporter.update.bind(teleporter), 10);
				this.centerer.appendChild(teleporter.element);
				// add these functions to be able to hide and show teleporter
				tile.show = tileShow;
				tile.hide = tileHide;
				tile.updateTeleporter = updateTeleporter;
			} else {
				// dummy function
				tile.updateTeleporter = Function.empty;
			}
		}
	})(),
	
	updateTeleporters: function () {
		this.mazeCanvas.getVisibleTiles().forEach(function (tile) {
			tile.updateTeleporter();
		});
	},
	
	// get the tile that the player is in
	tileWeAreIn: function () {
		return this.mazeCanvas.getTileAtPixel(this.x, this.y);
	}
});

// a link on a tile to teleport to that tile
var Teleporter = Classy(Box, {
	tagName: "a",
	coords: [0, 0],
	visible: false,
	
	constructor: function (mazeViewer, tile) {
		Box.call(this);
		this.tile = tile;
		
		// the teleporter goes to the start point of the tile.
		var start = tile.info.start || [0, 0];
		this.coords = [
			tile.offsetX + start[0],
			tile.offsetY + start[1]
		];
		
		var a = this.element;
		addClass(a, "marker teleporter");
		a.style.left = this.coords[0] + "px";
		a.style.top = this.coords[1] + "px";
		a.href = "#" + mazeViewer.mazeCanvas.getTileCoords(tile);
		a.onclick = this.onClick.bind(this);
		a.title = "Teleport here";
	},
	
	onClick: function (e) {
		e.preventDefault();
		this.teleport();
	},
	
	canShow: function () {
		var allowed = InfiniteMaze.loader.canTeleportToTile(this.tile);
		return allowed;
		//var inSameTile = InfiniteMaze.viewer.tileWeAreIn() == this.tile;
		//return allowed && !inSameTile;
	},
	
	update: function () {
		if (this.canShow()) this.show();
		else this.hide();
	},
	
	teleport: function (scroll) {
		var viewer = InfiniteMaze.viewer;
		var dest = this.coords;
		// If the point has no passable neighbors, it is a dead end,
		if (viewer.possibleDirections(point(dest[0], dest[1])).length == 0) {
			// and we must find a nearby passable point instead.
			// This way we avoid teleporting into oblivion.
			dest = this.findNearestPassablePointOnTileEdge();
			if (!dest) {
				alert("You can't teleport here!");
				return;
			}
		}
		viewer.setPosition(dest[0], dest[1]);
		if (scroll) {
			viewer.scrollTo(dest[0], dest[1]);
		}
	},
	
	// this is a very long function name
	findNearestPassablePointOnTileEdge: function () {
		var tile = this.tile;
		var startX = this.coords[0] - tile.offsetX;
		var startY = this.coords[1] - tile.offsetY;
		var point = null;
		var horizontal = Math.min(startY, 256 - startY) <
			Math.min(startX, 256 - startX);
		var data;
		if (horizontal) {
			data = tile.ctx.getImageData(0, startY, 256, 1).data;
		} else {
			data = tile.ctx.getImageData(startX, 0, 1, 256).data;
		}
		var isColorPassable = InfiniteMaze.viewer.isColorPassable;
		function test(n) {
			var p = horizontal ? [n, 0] : [0, n];
			var i = 4 * n;
			if (isColorPassable(data[i], data[i+1], data[i+2], data[i+3])) {
				point = [p[0] + tile.offsetX, p[1] + tile.offsetY];
				return true;
			}
		}
		// yes! i finally used a named statement block in js!
		search: {
			var start = horizontal ? startX : startY;
			var mid = 2 * Math.min(start, 256-start);
			// this stuff is too annoying to explain.
			for (var i = 0; i < mid; i++) {
				if (test(start + ((i % 2) ? (i - 1) : -i) / 2)) break search;
			}
			if (start > 127) for (i = 256 - mid; i > 0; i--) {
				if (test(i)) break search;
			} else for (i = mid; i < 256; i++) {
				if (test(i)) break search;
			}
		}
		return point;
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
		this.data = [];
		this.extend(this.element, data);
		this.selectCoord(0, 0);
	},
	
	// Connect the picker to a table with some data.
	extend: function (table, data) {
		var self = this;
		addClass(table, "picker");
		table.addEventListener("click", this.onClick.bind(this), false);
		if (!isArray(data)) throw new Error("Data must be an array.");
		if (data.length && !isArray(data[0])) data = [data];
		var tableId = this.data.length;
		this.data[tableId] = data;
		data.forEach(function (dataRow, i) {
			var row = table.insertRow(i);
			dataRow.forEach(function (value, j) {
				var cell = row.insertCell(j);
				cell.tableId = tableId;
				cell.row = i;
				cell.col = j;
				self.initCell(cell, value);
			});
		});
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
		this.value = this.data[cell.tableId][cell.row][cell.col];
		this.update();
	},
	
	selectCoord: function (row, col) {
		this.selectCell(this.element.rows[row].cells[col]);
	},
	
	update: function () {
		if (this.onSelect) this.onSelect(this.value);
	}
});
Picker.ify = Box.ify; // todo: do this automatically

var ColorPicker = Classy(Picker, {
	constructor: function (colors) {
		Picker.call(this, colors);
		this.element.id = "color-picker";
	},
	
	initCell: function (cell, color) {
		cell.style.backgroundColor = color;
	}
});
ColorPicker.ify = Picker.ify;

var SizePicker = Classy(Picker, {
	constructor: function (sizes) {
		Picker.call(this, [sizes]);
		this.element.id = "size-picker";
	},
	
	initCell: function (cell, size) {
		var circle = document.createElement("div");
		circle.className = "circle";
		this.resizeCircle(circle, size);
		cell.appendChild(circle);
	},
	
	select: function (x) {
		this.selectCoord(0, x);
	},
	
	resizeCircle: function (element, size) {
		var s = element.style;
		s.width = s.height = Math.max(size, 1) + "px";
		s.borderRadius =
			s.MozBorderRadius =
			s.WebkitBorderRadius = Math.max(size / 2, 1) + "px";
	},
	
	uncircle: function (element) {
		var s = element.style;
		s.width = s.height = "";
		s.borderRadius = s.MozBorderRadius = s.WebkitBorderRadius = "";
	}
});
SizePicker.ify = Picker.ify;

// a loader image thing
function Loader(element) {
	this.element = element;
}
Loader.prototype = {
	start: function () {
		addClass(this.element, "loading");
	},
	stop: function () {
		removeClass(this.element, "loading");
	}
};

var InfiniteMaze = {};

function $(id) {
	return document.getElementById(id);
}

var GridMazeTileEditor = Classy(Box, {
// Singleton.
// Knows the DOM.
constructor: function (viewer) {
	var toolboxElement = $("editor-toolbox");
	Box.ificate(this, toolboxElement);

	var tile, tileCoords;
	var tileBox = new DrawingTileBox(viewer);
	var cursor = tileBox.cursor;
	var cursorStyle = cursor.style;
	
	// entrance pixel to the tile
	var entrance;
	
	// Undo all edits to be undone if the user discards the edit session.
	var restore = Function.empty;
	
	var lastSnapshot = Function.empty;
	function saveForUndo() {
		lastSnapshot = snapshot();
	}
	
	function undo() {
		var redo = snapshot();
		lastSnapshot();
		lastSnapshot = redo;
	}
	
	// move the fake cursor on mousemove
	function onMouseMove(e) {
		var s = pencilSize / 2 - 2;
		cursorStyle.left = e.clientX - s + "px";
		cursorStyle.top = e.clientY - s + "px";
	}
	tileBox.element.addEventListener("mousemove", onMouseMove, false);

	// Mouse dragging, which will be attached to different tool behaviors
	var mouseControl = new DragBehavior({
		element: tileBox.element,
		context: this
	});
	
	// mouse dragging for drawing
	function onDrawDrag(e) {
		var ctx = tile.ctx;
		// draw on pixels, not in between them.
		var offset = 1.5;
		ctx.beginPath();
		ctx.moveTo(this.x + offset, this.y + offset);
		this.x = e._x;
		this.y = e._y;
		ctx.lineTo(this.x + offset, this.y + offset);
		ctx.stroke();
		
		// Stop dragging the tile or other funny stuff happening.
		e.stopPropagation();
		e.preventDefault();
		// but still allow the fake cursor to move
		onMouseMove(e);
	}
	
	// the set of event listeners (a behavior) for the drawing tool
	var drawingTool = {
		onDragStart: function (e) {
			saveForUndo();
			this.x = e._x - .01;
			this.y = e._y - .01;
			onDrawDrag.call(this, e);
		},
		onDrag: onDrawDrag,
		onDragEnd: null
	};
	
	// bucket tool behavior
	var bucketTool = {
		onDragStart: function (e) {
			saveForUndo();
			// bucket flood fill
			floodFill(tile.ctx, e._x, e._y, selectedColor, 30);
			e.stopPropagation();
		}
	};

	// Init color picker
	function hexToColor(hexInt) {
		var hex = hexInt.toString(16);
		return '#' + ('00000' + hex).substr(-6);
	}
	
	var colors = {
		light: [0xffffff, 0xf4aece, 0xffaa00, 0xffff00, 0x39ff39, 0x7cdaff, 0xa6a8ff, 0xcccccc],
		dark: [0x000000, 0x9f0000, 0x5e320b, /*0x716101,*/ 0x005c00, 0x0000ff, 0x63006d, 0x555555]
	};
	var selectedColor;
	var colorPicker = ColorPicker.ify($("color-picker-light"), colors.light.map(hexToColor));
	colorPicker.extend($("color-picker-dark"), colors.dark.map(hexToColor));
	colorPicker.onSelect = function setPencilColor(color) {
		selectedColor = color;
		if (tile) {
			tile.ctx.strokeStyle = color;
		}
		cursorStyle.borderColor = color;
	};
	colorPicker.selectCoord(0, 0);
	
	// Init size picker
	var pencilSizes = [18, 13, 8, 4, 1.5];
	var sizePicker = SizePicker.ify($("size-picker"), pencilSizes);
	var pencilSize;
	sizePicker.onSelect = function setPencilSize(size) {
		if (size == bucketTool) {
			pencilSize = 2;
			mouseControl.setBehavior(bucketTool);
			addClass(cursor, "bucket");
			sizePicker.uncircle(cursor);
			return;
		}
		
		mouseControl.setBehavior(drawingTool);
		removeClass(cursor, "bucket");
		
		pencilSize = +size;
		if (tile) {
			tile.ctx.lineWidth = pencilSize;
		}
		sizePicker.resizeCircle(cursor, size - 3);
	};
	sizePicker.select(0);
	
	sizePicker.extend($("bucket-tool"), [bucketTool]);
	
	// Init buttons.
	$("save-btn").onclick = save;
	$("discard-btn").onclick = discard;
	$("login-signup-link").onclick = function (e) {
		e.preventDefault();
		InfiniteMaze.loginSignupWindow.show();
	};
	$("undo-btn").onclick = undo;

	
	// returns a point within a tile that is closest to another point
	function nearestPointInTile(tile, adjacentPoint) {
		var el = tile.element;
		return [
			Math.max(tile.offsetX,
				Math.min(tile.offsetX + el.width, adjacentPoint[0])),
			Math.max(tile.offsetY,
				Math.min(tile.offsetY + el.height, adjacentPoint[1]))
		];
	}

	this.openForTile = function (t, adjacentPoint) {
		tile = t;
		entrance = nearestPointInTile(tile, adjacentPoint);

		tileCoords = viewer.mazeCanvas.getTileCoords(tile);
		restore = snapshot(true);

		// Place the tile box over the tile.
		viewer.centerer.appendChild(tileBox.element);
		tileBox.coverTile(tile);
		
		colorPicker.update();
		sizePicker.update();
		
		// scroll to center this tile
		viewer.scrollTo(
			tile.offsetX + viewer.tileSize[0]/2 + 20,
			tile.offsetY + viewer.tileSize[1]/2 + 60,
			true // slowly
		);
		
		toolboxElement.style.bottom = "-120px";
		removeClass(toolboxElement, "hidden");
		setTimeout(function() {
			Transition(toolboxElement, {bottom: "0px"}, 500);
			Transition(viewer.element, {bottom: "120px"}, 500, function () {
				viewer.updateViewport();
			});
		}, 0);
	};
	
	function close() {
		// remove the tile box
		viewer.centerer.removeChild(tileBox.element);

		Transition(toolboxElement, {bottom: "-120px"}, 500);
		Transition(viewer.element, {bottom: "0px"}, 500, function () {
			addClass(toolboxElement, "hidden");
			viewer.updateViewport();
		});

		viewer.exitDrawTileMode();
	}
	this.close = close;
	
	// Make a function to restore the tile to its current state.
	function snapshot(couldClear) {
		// only clear if we are exiting drawing mode
		if (couldClear && tile.isEmpty) {
			return function () {
				tile.clear();
			};
		} else {
			var w = tile.element.width;
			var h = tile.element.height;
			var imageData = tile.ctx.getImageData(0, 0, w, h);
			return function () {
				tile.ctx.putImageData(imageData, 0, 0);
			};
		}
	}
	
	function checkRules() {
		// TODO
		return true;
	}
	
	function save() {
		if (!InfiniteMaze.getUsername()) {
			alert("You must be logged in to save your drawing.");
			return;
		}
		if (!confirm("Are you sure you are ready to save?")) return;
		if (!checkRules()) {
			alert("You haven't followed all the rules! Fix your drawing and try again.");
			return;
		}
		InfiniteMaze.loader.saveTileDrawing(tile, tileCoords,
			function onError(status, error, reason) {
				alert("There was an error: " + reason);
			},
			function success() {
				close();
				// show a help window if it is the user's first drawing
				var firstDrawing = !InfiniteMaze.prefs.get("first-drawing");
				if (firstDrawing) {
					InfiniteMaze.prefs.set("first-drawing", "1");
					InfiniteMaze.postSaveWindow.show();
				}
			}
		);
	}
	this.save = save;
	
	function discard() {
		if (!confirm("You really want to discard your drawing?")) return;
		restore();
		close();
	}
	this.discard = discard;
	
	this.getTileEntrance = function () {
		return entrance;
	};
}
});

var InfiniteMazeLoader = Classy(MazeLoader, {
	tilesInfo: null,
	changesPromise: null,
	
	constructor: function (db, doc, tilesInfo, update_seq) {
		MazeLoader.call(this, db, doc);
		// {0:{0:tileinfo}}
		this.tilesInfo = tilesInfo;
		this.update_seq = update_seq;
	},
	
	listenForChanges: function () {
		var self = this;
		var tilesInfo = this.tilesInfo;
		// Start listening for tile changes
		var promise = this.changesPromise = this.db.changes(this.update_seq, {
			filter: "maze/tiles",
			maze_id: this.mazeId,
			include_docs: true
		});
		promise.onChange(function (resp) {
			self.update_seq = resp.last_seq;
			resp.results.forEach(function (change) {
				var doc = change.doc;
				// new tile doc
				var x = doc.location[0];
				var y = doc.location[1];
				var tile = InfiniteMaze.viewer.mazeCanvas.getTile(x, y);
				(tilesInfo[x] || (tilesInfo[x] = {}))[y] = {
					// imitation of maze_and_tiles view / maze list
					id: doc._id,
					creator: doc.creator,
					start: doc.start,
					nocache: !tile.isEmpty
				};
				// update the tile with the new doc
				InfiniteMaze.viewer.initMazeTile(tile, x, y);
			});
		});
		window.addEventListener("online", promise.start, false);
		window.addEventListener("offline", promise.stop, false);
	},
	
	listenForChangesSafe: function () {
		// Allow a timeout so the browser doesn't display a loader
		setTimeout(this.listenForChanges.bind(this), 3000);
	},
	
	stopListeningForChanges: function () {
		var promise = this.changesPromise;
		promise.stop();
		window.removeEventListener("online", promise.start, false);
		window.removeEventListener("offline", promise.stop, false);
	},
	
	// {location: [x, y], id: "#"}
	getTileInfo: function (x, y) {
		return (this.tilesInfo[x] || {})[y];
	},
	
	getTileSrc: function (x, y) {
		var tileInfo = this.getTileInfo(x, y);
		if (tileInfo) {
			return this.getDocAttachmentsPath(tileInfo.id) + 'tile.png' +
				(tileInfo.nocache ? '?' + Math.random() : '');
		}
	},
	
	makeTileDoc: function (cb) {
		cb({
			_id: Couch.newUUID(),
			//_id: "tile:" + this.mazeId + ":" + location,
			type: "tile",
			maze_id: this.mazeId,
			creator: InfiniteMaze.getUsername()
		});
	},
	
	getTileDoc: function (tile, cb) {
		var id = tile.info.id;
		if (id) {
			this.db.openDoc(id, {
				success: cb,
				error: function (status, error, reason) {
					alert(":( Error saving drawing: " + reason);
				}
			});
		} else {
			this.makeTileDoc(cb);
		}
	},

	saveTileDrawing: function (tile, tileCoords, onError, onSuccess) {
		var self = this;
		this.getTileDoc(tile, function (doc) {
			doc.location = tileCoords;
			var now = Date.now();
			if (doc.created_at) {
				doc.modified_at = now;
			} else {
				doc.created_at = now;
			}
			if (!doc.start) {
				var absStart = InfiniteMaze.editor.getTileEntrance();
				doc.start = tile.getPointRelative(absStart);
			}
			doc._attachments = {
				"tile.png": {
					content_type: "image/png",
					data: tile.exportPNG()
				}
			};
			self.db.saveDoc(doc, {
				error: onError,
				success: function () {
					//console.log('old tile info', tile.info);
					tile.info = {
						creator: doc.creator,
						id: doc._id,
						location: tile.info.location
					};
					tile.isEmpty = false;
					onSuccess.apply(this, arguments);
				}
			});
		});
	},
	
	setTileStart: function (tile, point) {
		this.getTileDoc(tile, function (doc) {
			doc.start = point;
			this.db.saveDoc(doc, {
				error: function (status, error, reason) {
					alert("Error. " + reason);
				}
			});
		}.bind(this));
	},
	
	isTileMine: function (tile) {
		var user = InfiniteMaze.getUsername();
		return user && (user == tile.info.creator);
	},
	
	canEditTile: function (tile) {
		var isAdmin = InfiniteMaze.sessionManager.isAdmin();
		return isAdmin || this.isTileMine(tile);
	},
	
	canClaimTile: function (tile) {
		var hasCreator = tile.info.creator;
		return !hasCreator && !tile.claimSubmitted;
		//var loggedIn = !!InfiniteMaze.getUsername();
		//return loggedIn && !hasCreator;
	},
	
	canFixTile: function (tile) {
		return InfiniteMaze.sessionManager.isAdmin();
	},
	
	canTeleportToTile: function (tile) {
		var isStartTile = tile.offsetX == 0 && tile.offsetY == 0;
		return isStartTile || this.isTileMine(tile); //canEditTile(tile);
	}
});

var HeaderBar = function () {
	var container = this.element = $("header");
	
	var accountNameLink = $("account-name-link");
	accountNameLink.onclick = function (e) {
		e.preventDefault();
		InfiniteMaze.accountSettingsWindow.show();
	};
	
	function updateForUser() {
		var user = InfiniteMaze.getUsername();
		if (user) {
			addClass($("app"), "logged-in");
			accountNameLink.innerHTML = user;
		} else {
			removeClass($("app"), "logged-in");
		}
	}
	
	$("logout-btn").onclick = function () {
		InfiniteMaze.sessionManager.logout(updateForUser);
	};
	$("login-signup-btn").onclick = function () {
		InfiniteMaze.loginSignupWindow.show();
	};
	$("help-link").onclick = function () {
		InfiniteMaze.welcomeWindow.show();
	};
	
	this.updateForUser = updateForUser;
};

var AccountSettingsWindow = Classy(Box, {
constructor: function () {
	var self = this;
	var container = $("settings-window");
	Box.ificate(this, container);
	
	var userDoc;
	
	function error(msg) {
		$("settings-result").innerHTML = msg;
	}
	
	// save changes
	function save() {
		Couch.userDb(function (db) {
			
		});
	}
	
	var form = $("settings-form");
	var loader = new Loader(container);
	
	this.show = function () {
		$("settings-username").innerHTML = InfiniteMaze.getUsername();
		loader.start();
		InfiniteMaze.sessionManager.userDoc(function (userDoc) {
			$("settings-email").value = userDoc.email;
			loader.stop();
		});
		Box.prototype.show.call(this);
	};
	
	form.onsubmit = function (e) {
		e.preventDefault();
		alert("Not working yet. Sorry!");
		/*loader.start();
		
		var currentPass = $("settings-password-current").value;
		var newPass = $("settings-password-new").value;
		var confirmNewPass = $("settings-password-confirm").value;
		var email = $("settings-email").value;
		
		if (confirmNewPass != newPass) {
			return error("You must retype your new password the same way to confirm it.");
		}
		
		save({
			currentPass: currentPass,
			newPass: newPass,
			email: email,
			success: function () {
				loader.stop();
				self.hide();
			},
			error: function (msg) {
				loader.stop();
				error(msg);
			}
		});*/
	};
	
	form.onreset = function (e) {
		e.preventDefault();
		self.hide();
	};
}
});

var WelcomeWindow = Classy(Box, {
constructor: function () {
	var self = this;
	var container = $("welcome");
	Box.ificate(this, container);

	// dark overlay over maze, behind welcome window
	var overlay = Box.ify($("overlay"));
	
	var enterButton = $("enter-btn");
	enterButton.focus();
	
	this.show = function () {
		Box.prototype.show.call(self);
		overlay.show();
		setTimeout(function () {
			Transition(container, {opacity: 1}, 500);
			Transition(overlay.element, {opacity: 0.7}, 250);
		});
		enterButton.focus();
	};
	
	function fullyHide() {
		Box.prototype.hide.call(self);
		overlay.hide();
	}
	this.hide = function (fast) {
		if (fast) {
			fullyHide();
		} else {
			Transition(container, {opacity: 0}, 500);
			Transition(overlay.element, {opacity: 0}, 250, fullyHide);
		}
	};

	var self = this;
	enterButton.onclick = function () {
		self.hide();
		if (self._onEnter) {
			self._onEnter();
		}
	};
}
});

var LoginSignupWindow = Classy(Box, {
constructor: function () {
	var container = $("login-signup-window");
	Box.ificate(this, container);
	
	this.show = function () {
		Box.prototype.show.call(this);
		$("login-username").focus();
	};
	
	var loader = new Loader(container);
	
	function onLogin(result) {
		loader.stop();
		loginForm.reset();
		signupForm.reset();
		alert("Login success.");
	}
	
	function onLoginError(msg) {
		loader.stop();
		$("login-result").innerHTML = msg;
	}
	
	function onSignupError(msg) {
		loader.stop();
		$("signup-result").innerHTML = msg;
	}
	
	var loginForm = $("login-form");
	loginForm.onreset = this.hide.bind(this);
	loginForm.onsubmit = function (e) {
		var username = $("login-username").value;
		var password = $("login-password").value;
		loader.start();
		InfiniteMaze.sessionManager.login(username, password, onLogin, onLoginError);
		// This form must be allowed to submit for some browsers to remember the login.
		// so we submit it into a dummy iframe.
	};
	
	var signupForm = $("signup-form");
	signupForm.onsubmit = function (e) {
		e.preventDefault();
		var username = $("signup-username").value;
		var password = $("signup-password").value;
		var email = $("signup-email").value;
		loader.start();
		InfiniteMaze.sessionManager.signup(username, password, email, onLogin, onSignupError);
	};
}
});

function validateEmailAddress(email, isGood, isBad) {
	var valid = typeof email == "string" && email.split('@').length == 2;
	(valid ? isGood : isBad)();
	// todo: Sophisticate this
	// http://www.webdigi.co.uk/blog/2009/how-to-check-if-an-email-address-exists-without-sending-an-email/
}

// Deals with signup, login, logout, and userCtx.
function SessionManager(db, userCtx) {
	var self = this;
	if (userCtx) {
		self.userCtx = userCtx;
	}
	
	// after login
	function dealWithNewUser() {
		InfiniteMaze.headerBar.updateForUser();
		InfiniteMaze.viewer.updateTeleporters();
	}
	
	function setUserCtx(ctx) {
		var oldUsername = self.userCtx.name;
		if (ctx) {
			self.userCtx = ctx;
		} else {
			// use prototypal value
			delete self.userCtx;
			ctx = self.userCtx;
		}
		if (ctx.name != oldUsername) {
			dealWithNewUser();
		}
	}
	
	this.refreshUserCtx = function (done) {
		Couch.session({
			success: function (session) {
				setUserCtx(session.userCtx);
				done();
			},
			error: function (a, b, c) {
				alert("Error getting session. " + a + ", " + b + ", " + c);
				setUserCtx(null);
				done();
			}
		});
	};
	
	this.logout = function (done) {
		Couch.logout({
			success: function (resp) {
				setUserCtx(null);
				done(resp);
			},
			error: function (status, error, reason) {
				alert("Error logging out. " + reason);
				done();
			}
		});
	};
	
	this.login = function (username, password, onSuccess, onError) {
		if (!username) return onError("You need to enter a username.");
		
		Couch.login({
			name: username,
			password: password,
			success: function success(ctx) {
				self.refreshUserCtx(function () {
					onSuccess(ctx);
				});
			},
			error: function (status, error, reason) {
				onError(reason);
			}
		});
	};
	
	this.signup = function (username, password, email, onSuccess, onError) {
		if (!username) return onError("Please choose a username.");
		if (!email) return onError("Please enter your email address.");
		
		validateEmailAddress(email,
			function goodEmail() {
				// need SHA1 for signup
				shim(window.hex_sha1, "scripts/sha1.js", function () {
					Couch.signup({name: username}, password, {
						success: function () {
							self.login(username, password, function () {
								// make the user info doc
								db.saveDoc({
									_id: "user-info:" + username,
									type: "user-info",
									name: username,
									signup: Date.now(),
									email: email
								}, {
									success: onSuccess,
									error: onError
								});
							}, onError);
						},
						error: function (status, error, reason) {
							if (error == "conflict") {
								onError("The username \"" + username +
									"\" is already taken.");
							} else {
								onError("Error: " + reason);
							}
						}
					});
				});
			},
			function badEmail(valid) {
				onError("That doesn't look like an email address…");
			}
		);
	};
	
	var getUserDb = Couch.userDb.memoized();
	
	this.userDoc = function (cb) {
		cb({
			email: '?',
			name: InfiniteMaze.getUsername()
		});
		/*
		getUserDb(function (db) {
			var userPrefix = "org.couchdb.user:";
			var id = userPrefix + userName;
			//db.openDoc(id);
			cb(db);
		});
		*/
	};
	
	this.isAdmin = function () {
		return self.userCtx.roles.indexOf("_admin") != -1;
	};
}
SessionManager.prototype.userCtx = {db:"maze",name:null,roles:[]};

// A way for users to claim old anonymous tiles.
function TileClaimer(db) {
	this.claimTile = function (tile) {
		var user = InfiniteMaze.getUsername();
		if (tile.info.creator || !user) {
			return false;
		}
		db.saveDoc({
			type: "claim",
			claim_type: "tile",
			tile_id: tile.info.id,
			user: user,
			created_at: Date.now()
		}, {
			error: function (status, error, reason) {
				alert("There was an error claiming that tile: " + reason);
			}
		});
	};
}

// Preferences manager

function Prefs(prefix, expires) {
	this.prefix = prefix;
}
Prefs.prototype = {
	prefix: "",
	backend: window.localStorage ? {
		get: localStorage.getItem.bind(localStorage),
		set: localStorage.setItem.bind(localStorage)
	} : {
		expires: 60,
		get: function (key, value) {
			return Cookie.get(key, value, this.expires);
		},
		set: function (key, value) {
			Cookie.set(key, value, this.expires);
		}
	},
	get: function (key) {
		return this.backend.get(this.prefix + key);
	},
	set: function (key, value) {
		this.backend.set(this.prefix + key, value);
	}.throttled(50)
};


var YouAreHereMarker = Classy(Box, {
constructor: function (viewer) {
	var element = document.createElement("div");
	element.id = "you-are-here";
	Box.ificate(this, element);
	
	var link = document.createElement("a");
	link.href = "";
	link.onclick = function (e) {
		e.preventDefault();
		viewer.scrollTo(viewer.x, viewer.y, true);
	};
	element.appendChild(link);
	var linkText = document.createTextNode("");
	link.appendChild(linkText);
	
	// the arrows point to the player's location
	var arrows = "→↘↓↙←↖↑↗→";
	
	// depend on proximity to player's location
	var prepositions = [
		"",
		"over",
		"way over",
		"waayy over",
		"really far over"
	];
	
	// the message changes depending on the distance to the player's location
	function updateText(x, y) {
		var angle = Math.atan2(x, y);
		var direction = Math.round(angle / (2 * Math.PI) * 8 + 4);
		var arrow = arrows[direction];
		var degree = Math.pow(distance(x, y), 1/2) / 30;
		var preposition = prepositions[~~Math.min(degree, prepositions.length)];
		linkText.nodeValue = "You are " + preposition + " here " + arrow;
	}
	updateText(0, 0);
	
	function constrain(number, min, max) {
		return Math.min(max, Math.max(min, number));
	}
	
	var self = this;
	this.update = function () {
		// relative to viewport
		// offsetX ~= viewer.scroller.x + viewerW / 2 + 12
		var playerX = viewer.x + viewer.offsetX;
		var playerY = viewer.y + viewer.offsetY;
		var mouseX = viewer.mouseX + viewer.offsetX;
		var mouseY = viewer.mouseY + viewer.offsetY;
		var viewerW = viewer.element.offsetWidth;
		var viewerH = viewer.element.offsetHeight;
		var markerW = element.offsetWidth;
		var markerH = element.offsetHeight;
		
		var effectiveViewerW = viewerW - markerW;
		var effectiveViewerH = viewerH - markerH;
		
		var headerH = InfiniteMaze.headerBar.element.offsetHeight;
		var headerW = InfiniteMaze.headerBar.element.offsetWidth;
		
		if (distance(playerX - mouseX, playerY - mouseY) < 250) {
			// mouse is near player, so don't need to show this pointer.
			self.hide();
			return;
		}
		
		var top = 0;
		// move out of the way of the login buttons.
		if (playerY < headerH &&
			effectiveViewerW - playerX < headerW) {
			top += headerH;
		}
		
		var markerX = constrain(playerX, 0, effectiveViewerW);
		var markerY = constrain(playerY, top, effectiveViewerH);
		
		updateText(
			markerY - playerY + markerH / 2,
			markerX - playerX + markerW / 2
		);
		
		self.show();
		element.style.left = markerX + "px";
		element.style.top = markerY + "px";
	}.throttled(30)

	link.onmouseover = this.update;
}
});

var ClosableDialog = Classy(Box, {
	constructor: function () {
		Box.call(this);
		this.addCloseButton();
	},
	addCloseButton: function () {
		var closeButton = document.createElement("div");
		closeButton.className = "close";
		closeButton.appendChild(document.createTextNode("X")); //×
		closeButton.onclick = this.hide.bind(this);
		this.element.appendChild(closeButton);
	}
});

var PostSaveWindow = Classy(ClosableDialog, {
constructor: function () {
	this.element = $("post-save-window");
	ClosableDialog.call(this);
}
});


// The App

// init immediate things
InfiniteMaze.init = function (cb) {
	Couch.urlPrefix = ".";
	this.db = Couch.db("db");
	
	var defaultMazeId = "1";
	this.mazeId = parseQuery(location.search.substr(1)).maze || defaultMazeId;
	
	this.prefs = new Prefs("infinitemaze-");
	this.welcomeWindow = new WelcomeWindow();
	this.headerBar = new HeaderBar();
	
	// on return visits don't show the welcome window.
	if (this.hasPlayerEntered()) {
		this.welcomeWindow.hide(true);
	} else {
		this.welcomeWindow._onEnter = this.playerHasEntered.bind(this);
	}
	
	if (this.playerPositionStored()) {
		this.startPos = this.getStoredPlayerPosition();
		this.startScrollPos = this.getStoredScrollPosition();
		this.init2(cb);
	} else {
		this.getRandomStartPoint(function (coords) {
			this.startTileCoords = coords;
			this.init2(cb);
		}.bind(this));
	}
};

// Load the maze data.
InfiniteMaze.init2 = function (cb) {
	var self = this;
	shim(window.JSON, "scripts/json2.js", function () {
		self.db.list("maze/maze", "maze_and_tiles", {
			key: self.mazeId,
			success: function (data) {
				self.init3(data, cb);
			}
		});
	});
};

// Render the maze and do the real initing
InfiniteMaze.init3 = function (info, cb) {
	var self = this;
	var mazeDoc = info.maze;
	var tiles = info.tiles;
	var userCtx = info.userCtx;
	var update_seq = info.update_seq;
	
	this.sessionManager = new SessionManager(this.db, userCtx);
	this.loader = new InfiniteMazeLoader(this.db, mazeDoc, tiles, update_seq);
	var viewer = this.viewer = new GridMazeViewer({
		loader: this.loader,
		container: $("maze"),
		startPos: this.startPos,
		startScrollPos: this.startScrollPos,
		onMove: this.onMove,
		onScroll: this.onScroll,
		context: this
	});
	
	// If we have loaded a random start tile, we must teleport to it.
	var coords = this.startTileCoords;
	if (coords) {
		var startTile = viewer.mazeCanvas.getTile(coords[0], coords[1]);
		startTile.onLoad(function () {
			var teleporter = startTile.teleporter;
			if (teleporter) {
				teleporter.teleport(true);
			} else {
				console.log('no teleporter');
				//alert(coords);
			}
			this.viewer.load();
		}.bind(this));
	} else {
		this.viewer.load();
	}
	
	this.editor = new GridMazeTileEditor(this.viewer);
	this.headerBar.updateForUser();
	this.loginSignupWindow = new LoginSignupWindow();
	this.postSaveWindow = new PostSaveWindow();
	this.accountSettingsWindow = new AccountSettingsWindow();
	this.claimer = new TileClaimer(this.db);
	
	if (info.listen_changes !== false) {
		this.loader.listenForChangesSafe();
	}
	
	function updateLocationFromHash(e, fast) {
		var hash = location.hash.substr(1);
		if (!hash) return;
		var loc = hash.split(",");
		var x = (loc[0] * 256 || 0) + 127;
		var y = (loc[1] * 256 || 0) + 127;
		viewer.scrollTo(x, y, !fast);
		viewer.updateOffset();
	}
	updateLocationFromHash(null, true);
	window.addEventListener("hashchange", updateLocationFromHash, false);
	
	if (cb) {
		cb.call(this);
	}
};

InfiniteMaze.getUsername = function () {
	return this.sessionManager.userCtx.name;
};

InfiniteMaze.getUserEmail = function () {
	return 'asdf@asdf';
};

InfiniteMaze.getRandomStartPoint = function (cb) {
	//setTimeout(cb.curry([-1,1]), 200);
	this.db.openDoc("start-tiles:" + this.mazeId, {
		success: function (doc) {
			var points = doc.tiles;
			var point = points[~~(Math.random() * points.length)];
			//alert(point);
			cb(point);
		},
		error: function () {
			// default to center tile
			cb([0, 0]);
		}
	});
};

// store and retrieve positions

InfiniteMaze.onScroll = function (x, y) {
	this.prefs.set("scroll-position-" + this.mazeId, x + "," + y);
};
InfiniteMaze.onMove = function (x, y) {
	this.prefs.set("player-position-" + this.mazeId, x + "," + y);
};

InfiniteMaze.hasPlayerEntered = function () {
	return !!this.prefs.get("entered");
};
InfiniteMaze.playerHasEntered = function () {
	this.prefs.set("entered", "1");
};
InfiniteMaze.playerPositionStored = function () {
	return !!this.prefs.get("player-position-" + this.mazeId);
};
InfiniteMaze.getStoredPlayerPosition = function () {
	var str = this.prefs.get("player-position-" + this.mazeId);
	return str && str.split(",").map(Number);
};
InfiniteMaze.getStoredScrollPosition = function () {
	var str = this.prefs.get("scroll-position-" + this.mazeId);
	return str && str.split(",").map(Number);
};


// Google Analytics
if (location.hostname != "localhost") {
	loadScript("http://www.google-analytics.com/ga.js", function () {		 
		_gat._getTracker("UA-11963387-3")._trackPageview();		 
	});
}
