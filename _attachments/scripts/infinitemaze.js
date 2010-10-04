Couch.urlPrefix = "/couchdb";
var mazesDb = Couch.db("maze");//db");
var maze;
var container;
var mazeId = '1';

function init() {
	if (!window.JSON) {
		loadScript("scripts/json2.js", init2);
	} else {
		init2();
	}
}

function init2() {
	container = document.getElementById("main");
	maze = new GridMazeViewer({
		container: container,
		getTileSrc: getTileSrc,
		startPos: [237, 600]
	});
}

var tiles = [
	[
		0,
		1,
		1
	],
	[
		0,
		0,
		0,
		1
	]
];
function getTileSrc(x, y) {
	if ((tiles[x] || {})[y]) {
		return '/couchdb/maze/independence-wizard/' +
			y + '_' + x + '.png';
	}
}