function(doc) {
	if (doc.type == "maze" && doc.format == "infinite-tiled") {
		emit(doc._id, {maze: doc});
	} else if (doc.type == "tile" && doc.location) {
		emit(doc.maze_id, {
			location: doc.location,
			start: doc.start,
			creator: doc.creator
		});
	}
}