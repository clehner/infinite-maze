function (doc) {
	if (doc.type == 'tile') {
		emit([doc.maze_id, doc.creator], {
			id: doc._id,
			location: doc.location
		});
	}
}