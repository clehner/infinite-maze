function (doc) {
	if (doc.type == 'tile') {
		emit([doc.maze_id, doc.creator], 1);
		/*{
			id: doc._id,
			location: doc.location
		}*/
	} else if (doc.type == 'user-info') {
		emit(["1", doc.name], 0);
	}
}