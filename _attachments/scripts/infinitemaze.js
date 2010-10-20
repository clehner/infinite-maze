//Couch.urlPrefix = "/couchdb";
Couch.urlPrefix = ".";
var mazesDb = Couch.db("db");//maze");
var maze;

// Dummy Infinite Maze Loader
var dummyMazeDoc = {
	_id: "dumdum",
	start: [237, 600]
};
var loader = new MazeLoader(mazesDb, dummyMazeDoc);
var tiles = [
	[0,1,1],
	[0,0,0],
	[0,0,0]
];
loader.getTileSrc = function (x, y) {
	if ((tiles[x] || {})[y]) {
		return 'db/independence-wizard/' + y + '_' + x + '.png';
	}
}


function init() {
	if (!window.JSON) {
		loadScript("scripts/json2.js", init2);
	} else {
		init2();
	}
}

function init2() {
	maze = new GridMazeViewer({
		container: document.getElementById("main"),
		loader: loader
	});
}
