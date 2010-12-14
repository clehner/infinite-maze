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
}

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
var EmptyTileBox = Classy(TileBox, {
	tileInfoEl: null,
	innerTileInfo: null,
	nameElement: null,
	nameText: null,
	editLink: null,
	claimLink: null,
	
	constructor: function () {
		TileBox.apply(this, arguments);
		addClass(this.element, "empty");
		
		this.tileInfoEl = document.createElement("div");
		this.tileInfoEl.className = "tile-info";
		this.element.appendChild(this.tileInfoEl);
		
		this.innerTileInfo = document.createElement("span");
		this.innerTileInfo.className = "tile-info-inner";
		this.tileInfoEl.appendChild(this.innerTileInfo);
		
		this.nameElement = document.createElement("span");
		this.nameElement.className = "name";
		this.innerTileInfo.appendChild(this.nameElement);
		
		this.nameText = document.createTextNode("");
		this.nameElement.appendChild(this.nameText);
		
		this.editLink = document.createElement("a");
		this.editLink.href = "";
		this.editLink.onclick = this.onEditLinkClick.bind(this);
		this.editLink.innerHTML = "Edit";
		this.innerTileInfo.appendChild(document.createTextNode(" "));
		this.innerTileInfo.appendChild(this.editLink);
		
		this.claimLink = document.createElement("a");
		this.claimLink.href = "";
		this.claimLink.onclick = this.onClaimLinkClick.bind(this);
		this.claimLink.innerHTML = "Claim";
		this.innerTileInfo.appendChild(document.createTextNode(" "));
		this.innerTileInfo.appendChild(this.claimLink);
		
		this.fixLink = document.createElement("a");
		this.fixLink.href = "";
		this.fixLink.onclick = this.onFixLinkClick.bind(this);
		this.fixLink.innerHTML = "Fix";
		this.innerTileInfo.appendChild(document.createTextNode(" "));
		this.innerTileInfo.appendChild(this.fixLink);
	},
	coverTile: function (tile) {
		TileBox.prototype.coverTile.call(this, tile);

		// put the creators name on the tile
		var name = tile.info.creator || "anonymous";
		this.nameText.nodeValue = name;
		this.nameElement.title = 'This maze square was drawn by "' + name + '"';
		
		toggleClass(this.editLink, "hidden", !this.canEditThisTile());
		toggleClass(this.claimLink, "hidden", !this.canClaimThisTile());
		toggleClass(this.fixLink, "hidden", !this.canFixThisTile());
	},
	onEditLinkClick: function (e) {
		e.preventDefault();
		if (this.canEditThisTile()) {
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
			if (confirm("Did you draw this tile? If so, log in to claim it.")) {
				InfiniteMaze.loginSignupWindow.show();
			}
		}
	},
	canEditThisTile: function () {
		var loggedInUser = InfiniteMaze.getUsername();
		var isAdmin = InfiniteMaze.sessionManager.isAdmin();
		return loggedInUser &&
			(isAdmin || (this.tile.info.creator == loggedInUser));
	},
	canClaimThisTile: function () {
		var hasCreator = this.tile.info.creator;
		return !hasCreator && !this.tile.claimSubmitted;
		//var loggedIn = !!InfiniteMaze.getUsername();
		//return loggedIn && !hasCreator;
	},
	canFixThisTile: function () {
		if (!InfiniteMaze.sessionManager.isAdmin()) return false;
		var start = this.tile.info.start;
		return start && (start[0] < 0 || start[0] > 256 ||
			start[1] < 0 || start[1] > 256);
	},
	onFixLinkClick: function (e) {
		e.preventDefault();
		InfiniteMaze.loader.fixTile(this.tile);
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
	},
	onButtonClick: function () {
		this.maze.enterDrawTileMode(this.tile);
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

	// Tile boxes show borders and information over the maze grid squares.
	// The "draw here" tile box includes a button that the user can click to
	// go to drawing mode and draw the tile.
	emptyTileBox: null,
	getHereTileBox: null,
	drawHereTileBox: null,
	
	// a tile in draw mode
	drawingTile: null,
	
	editor: null,
	
	constructor: function (options) {
		MazeViewer.call(this, options);
		this.load();
		
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
		var tileWidth = this.tileSize[0];
		var tileHeight = this.tileSize[1];
		var xInTile = x % tileWidth;
		var yInTile = y % tileHeight;
		
		// Find any adjacent tiles, and hover them.
		if (xInTile == 0) {
			this._onTileAdjacent(x - tileWidth, y);
		} else if (xInTile == -1 || xInTile == tileWidth - 1) {
			this._onTileAdjacent(x + tileWidth, y);
		}
		if (yInTile == 0) {
			this._onTileAdjacent(x, y - tileHeight);
		} else if (yInTile == -1 || yInTile == tileHeight - 1) {
			this._onTileAdjacent(x, y + tileHeight);
		}
		
		MazeViewer.prototype.setPosition.call(this, x, y);
	},
	
	// called when the player's location is one pixel away from an adjacent tile
	_onTileAdjacent: function (x, y) {
		var tile = this.mazeCanvas.getTileAtPixel(x, y);
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
		this.isInViewMode = true;
		addClass(this.centerer, "in");
	},

	showHelpWindow: function () {},
	hideHelpWindow: function () {}
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
	
	// Allow edits to be undone if the user discards them.
	var restore = function () {};
	
	// move the fake cursor on mousemove
	function onMouseMove(e) {
		var s = pencilSize / 2 - 2;
		cursorStyle.left = e.clientX - s + "px";
		cursorStyle.top = e.clientY - s + "px";
	}
	tileBox.element.addEventListener("mousemove", onMouseMove, false);

	// Mouse dragging behavior
	var mouseControl = new DragBehavior({
		element: tileBox.element,
		context: this
	});
	
	// mouse dragging for drawing
	function onDrawDrag(e) {
		var ctx = tile.ctx;
		// draw on pixels, not in between them.
		var offset = 0.5;
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
		light: [0xffffff, 0xf4aece, 0xffaa00, 0xffff00, 0x39ff39, 0x80ffff, 0xa6a8ff, 0xcccccc],
		dark: [0x000000, 0xaa0000, 0x5e320b, /*0x716101,*/ 0x005c00, 0x0000ff, 0x63006d, 0x555555]
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
		restore = makeRestore();

		// Place the tile box over the tile.
		viewer.centerer.appendChild(tileBox.element);
		tileBox.coverTile(tile);
		
		colorPicker.update();
		sizePicker.update();
		
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
	};
	this.close = close;
	
	// Make a function to restore the tile to its pre-edit state.
	function makeRestore() {
		if (tile.isEmpty) {
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
			close // success
		);
	};
	this.save = save;
	
	function discard() {
		if (!confirm("You really want to discard your drawing?")) return;
		restore();
		close();
	};
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
			maze_id: this.mazeId
		});
		promise.onChange(function (resp) {
			var docsToUpdate = {};
			self.update_seq = resp.last_seq;
			resp.results.forEach(function (change) {
				docsToUpdate[change.id] = true;
			});
			// todo: combine these requests
			for (var id in docsToUpdate) {
				self.db.openDoc(id, {
					success: function (doc) {
						// new tile doc
						var x = doc.location[0];
						var y = doc.location[1];
						var tile = InfiniteMaze.viewer.mazeCanvas.getTile(x, y);
						(tilesInfo[x] || (tilesInfo[x] = {}))[y] = {
							// imitation of maze_and_tiles view / maze list
							id: id,
							creator: doc.creator,
							start: doc.start,
							nocache: !tile.isEmpty
						};
						// update the tile with the new doc
						InfiniteMaze.viewer.initMazeTile(tile, x, y);
					}
				});
			}
		});
		window.addEventListener("online", promise.start, false);
		window.addEventListener("offline", promise.stop, false);
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
			doc.created_at = Date.now();
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
					tile.info = {
						creator: doc.creator,
						id: doc._id
					};
					tile.isEmpty = false;
					onSuccess.apply(this, arguments);
				}
			});
		});
	},
	
	fixTile: function (tile) {
		this.getTileDoc(tile, function (doc) {
			doc.start = [doc.start[0] % 256, doc.start[1] % 256];
			this.db.saveDoc(doc, {
				success: function () {
					alert("Fixed.");
				},
				error: function (status, error, reason) {
					alert("Error. " + reason);
				}
			});
		}.bind(this));
	}
});

var HeaderBar = function () {
	var container = $("header");
	
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
	this.hide = function () {
		Transition(container, {opacity: 0}, 500);
		Transition(overlay.element, {opacity: 0}, 250, fullyHide);
	};

	enterButton.onclick = this.hide;
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
		alert("You have logged in successfully.");
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
function SessionManager(userCtx) {
	var self = this;
	if (userCtx) {
		self.userCtx = userCtx;
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
			// Deal with new user
			InfiniteMaze.headerBar.updateForUser();
		}
	};
	
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
		if (!username) return onError("Username is required.",
			"Please choose a username.");
		if (!email) return onError("Email is required.",
			"Please enter your email address to sign up.");
		
		validateEmailAddress(email,
			function goodEmail() {
				// need SHA1 for signup
				shim(window.hex_sha1, "../scripts/sha1.js", function () {
					Couch.signup({
						name: username,
						signup_date: Date.now(),
						email: email,
					}, password, {
						success: function () {
							self.login(username, password, onSuccess, onError);
						},
						error: function (a, b, c) {
							onError("Sorry, something went wrong in the signup process: " + a + ", " + b + ", " + c);
						}
					});
				});
			},
			function badEmail(valid) {
				onError("Bad email. Try a different one.");
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


// The App

InfiniteMaze.init = function (db, info, cb) {
	var self = this;
	var mazeDoc = info.maze;
	var tiles = info.tiles;
	var userCtx = info.userCtx;
	var update_seq = info.update_seq;
	shim(window.JSON, "../scripts/json2.js", function () {
		this.sessionManager = new SessionManager(userCtx);
		this.loader = new InfiniteMazeLoader(db, mazeDoc, tiles, update_seq);
		this.viewer = new GridMazeViewer({
			loader: this.loader,
			container: $("maze")
		});
		this.viewer.enterMaze();
		this.editor = new GridMazeTileEditor(this.viewer);
		this.headerBar = new HeaderBar();
		this.headerBar.updateForUser();
		this.welcomeWindow = new WelcomeWindow();
		this.loginSignupWindow = new LoginSignupWindow();
		this.accountSettingsWindow = new AccountSettingsWindow();
		this.claimer = new TileClaimer(db);
		if (info.listen_changes !== false) {
			window.addEventListener("load", function () {
				setTimeout(function () {
					self.loader.listenForChanges();
				}, 100);
			}, false);
		}
		if (cb) {
			cb.call(this);
		}
		function updateLocationFromHash() {
			var hash = location.hash.substr(1);
			var loc = hash.split(",");
			var x = (loc[0] * 256 || 0) + 127;
			var y = (loc[1] * 256 || 0) + 127;
			self.viewer.scrollTo(x, y);
			self.viewer.updateOffset();
		}
		updateLocationFromHash();
		window.addEventListener("hashchange", updateLocationFromHash, false);
	}.bind(this));
};

InfiniteMaze.getUsername = function () {
	return this.sessionManager.userCtx.name;
};

InfiniteMaze.getUserEmail = function () {
	return 'asdf@asdf';
};
