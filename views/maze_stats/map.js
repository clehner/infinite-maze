function (doc) {
	if (doc.type == 'tile') {
		var loc = doc.location;
		emit(doc.maze_id, {
			area: 1,
			height: 1,
			width: 1,
			bounds: [loc, loc]
		});
	}
}