var fs = require('fs'),
	couchdb = require('./node-couchdb'),
	cred = require('./credentials'),
	client = couchdb.createClient(cred.couchdb.port || 5984, cred.couchdb.host, 
		cred.couchdb.user, cred.couchdb.pass),
	db = client.db('maze'),
	
	Canvas = require('canvas'),
	canvas = new Canvas(512, 512),
	ctx = canvas.getContext('2d');

// debounce() by John Hann
// http://unscriptable.com/index.php/2009/03/20/debouncing-javascript-methods/
function debounce(func, threshold, execAsap) {
	var timeout;
	return function debounced() {
		var obj = this, args = arguments;
		function delayed() {
			if (!execAsap) func.apply(obj, args);
			timeout = null; 
		}
		if (timeout) clearTimeout(timeout);
		else if (execAsap) func.apply(obj, args);
		timeout = setTimeout(delayed, threshold || 100); 
	};
}

// var miniMapDocId = "mini-map";
var saveMinimap = debounce(function () {
	/*
	canvas.toBuffer(function (er, buf) {
		if (er) throw new Error(JSON.stringify(er));
		db.saveAttachmentBuffer(buf, "tile.png", "image/png",
			miniMapDocId, null, function (er) {
				
			}
		);
	});
	*/
	
	var dest = __dirname + '/text.png';
	canvas.createPNGStream().pipe(fs.createWriteStream(dest))
		.stream.on('end', function(){
			console.log('saved png');
		});
}, 100);

var mazeId = "1";

var update_seq = 0;

var mazeTileSize; // [256, 256];

db.getDoc(mazeId, function (er, doc) {
	if (er) throw new Error(JSON.stringify(er));
	mazeTileSize = doc.tile_size;
	listenForChanges();
});

function listenForChanges() {
	db.changesStream({
		filter: 'maze/tiles',
		maze_id: mazeId,
		include_docs: true,
		since: update_seq
	}).addListener('data', function (change) {
		var doc = change.doc;
		if (!doc) return;
		var x = doc.location[0];
		var y = doc.location[1];
		var tileImageUrl = change.id;
		var img = new Image();
		img.src = tileImageUrl;
		img.onload = function () {
			ctx.drawImage(img, x, y);
			saveMinimap();
		};
	});
}
