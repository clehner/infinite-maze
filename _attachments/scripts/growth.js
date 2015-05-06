/* global Couch */
Couch.urlPrefix = ".";
var db = Couch.db("db");
if (location.pathname.indexOf("/_attachments/") != -1) {
	Couch.urlPrefix = "";
}

function $(id) {
	return document.getElementById(id);
}

var msgEl = $("msg");
function setMsg(msg) {
	msgEl.innerHTML = msg;
}

var tiles;
var tilesByDay = {};
function gotData() {
	for (var x in tiles) {
		for (var y in tiles[x]) {
			var tile = tiles[x][y];
			var day = new Date(tile.creation).toDateString();
			(tilesByDay[day] || (tilesByDay[day] = [])).push(tile);
		}
	}
	setDay(0);
}

function getTileURL(tile) {
	return "db/" + tile.id + "/tile.png";
}

function getTileImage(tile) {
	var img = tile.img;
	if (!img) {
		img = tile.img = new Image();
		img.src = getTileURL(tile);
	}
	return img;
}

var tileSize = 256;
function adjustImagePosition(tile) {
	var s = tile.img.style;
	s.left = tile.location[0] * tileSize + "px";
	s.top = tile.location[1] * tileSize + "px";
	s.width = tileSize + "px";
	s.height = tileSize + "px";
}

var tileContainer = $("tiles");
var visibleTiles = [];
function showTile(tile) {
	if (tile.visible) return;
	var img = getTileImage(tile);
	adjustImagePosition(tile);
	tile.visible = true;
	tileContainer.appendChild(img);
	visibleTiles.push(tile);
}
function hideTile(tile) {
	if (!tile.visible) return;
	tile.visible = false;
	tileContainer.removeChild(getTileImage(tile));
	visibleTiles.splice(visibleTiles.indexOf(tile), 1);
}

var wrapper = $("wrapper");
function adjustDimensions() {
	var size = visibleTiles.reduce(function (stuff, tile) {
		return {
			min: [
				Math.min(tile.location[0], stuff.min[0]),
				Math.min(tile.location[1], stuff.min[1])
			],
			max: [
				Math.max(tile.location[0], stuff.max[0]),
				Math.max(tile.location[1], stuff.max[1])
			]
		};
	}, {
		min: [0, 0],
		max: [0, 0]
	});
	var min = size.min;
	var max = size.max;
	var range = [max[0] - min[0] + 1, max[1] - min[1] + 1];
	var outer = [wrapper.clientWidth, wrapper.clientHeight];
	tileSize = Math.min(256,
		outer[0] / range[0],
		outer[1] / range[1]
	);
	var s = tileContainer.style;
	s.left = outer[0]/2 - (range[0]/2 + min[0]) * tileSize + "px";
	s.top = outer[1]/2 - (range[1]/2 + min[1]) * tileSize + "px";
	visibleTiles.forEach(adjustImagePosition);
}

var dayLength = 86400000;
var start = +new Date('Oct 18 2010');
function getDayRelative(n) {
	return new Date(start + dayLength * n);
}

function getTilesOnDay(date) {
	return (tilesByDay[date.toDateString()] || []);
}

function getTilesRange(from, to) {
	// not including from
	// don't go backwards
	if (from >= to) return [];
	var tiles = [];
	var toN = +to;
	for (var d = +from + dayLength; d <= toN; d += dayLength) {
		tiles.push.apply(tiles, getTilesOnDay(new Date(d)));
	}
	return tiles;
}

var day, n = 0, ignore;
function setDay(t) {
	if (ignore) return;
	n = t;
	var prevDay = day;
	day = getDayRelative(t);
	setMsg(day.toDateString());
	if (prevDay) getTilesRange(day, prevDay).forEach(hideTile);
	getTilesRange(prevDay, day).forEach(showTile);
	adjustDimensions();
}
function incDayStart() {
	// increment to the start of tomorrow, but display today's date.
	setMsg(day.toDateString());
	day = getDayRelative(++n);
	ignore = true;
	dateSlider.value = (day - start) / dayLength;
	ignore = false;
	adjustDimensions();
	if (+dateSlider.value >= +dateSlider.max) {
		stop();
	}
}

var dateSlider = $("date-slider");
dateSlider.onchange = function () {
	setDay(this.value)
};

var timer;
var dayInterval = 250;
function animateNextDay() {
	incDayStart();
	var dayStartTime = day.getTime();
	getTilesOnDay(day).forEach(function (tile) {
		setTimeout(function () {
			showTile(tile);
		}, dayInterval * (tile.creation - dayStartTime) / dayLength);
	});
}
var checkbox = $("control");
function stop() {
	checkbox.checked = false;
	clearTimeout(timer);
}
checkbox.onchange = function () {
	if (this.checked) {
		timer = setInterval(animateNextDay, dayInterval);
	} else {
		clearTimeout(timer);
	}
};

setMsg("loading…");

var mazeId = "1";
/*
db.list("maze/maze", "maze_and_tiles_with_creation", {
	key: mazeId,
	success: function (data) {
		tiles = data.tiles;
		gotData();
	}
});
*/

function reduceDataToTiles(data) {
	var rows = data.rows;
	var maze, row, location;
	tiles = {};
	for (var i = 0; i < rows.length; i++) {
		var row = rows[i];
		var value = row.value;
		if (!maze && value.maze) {
			maze = value.maze;
		} else if (location = value.location) {
			var x = location[0];
			var y = location[1];
			value.id = row.id;
			(tiles[x] || (tiles[x] = {}))[y] = value;
		}
	}
	gotData();
}

db.view("maze/maze_and_tiles_with_creation", {
	key: mazeId,
	success: reduceDataToTiles
});
