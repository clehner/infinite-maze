function(doc) {
	delete doc._attachments;
	delete doc._rev;
	if (doc.type == "maze" && doc.format == "infinite-tiled") {
		emit(doc._id, {maze: doc});
	} else if (doc.type == "tile" && doc.location) {
		var tiles = {};
		var x = doc.location[0];
		var y = doc.location[1];
		(tiles[x] || (tiles[x] = {}))[y] = doc._id;
		emit(doc.maze_id, {tiles: tiles});
	}
}