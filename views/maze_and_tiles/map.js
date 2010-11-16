function(doc) {
	if (doc.type == "maze" && doc.format == "infinite-tiled") {
		delete doc._attachments;
		delete doc._rev;
		emit(doc._id, {maze: doc});
	} else if (doc.type == "tile" && doc.location) {
		emit(doc.maze_id, doc.location);
	}
}