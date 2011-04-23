function (doc) {
	if (doc.type == 'tile') {
		var size = doc._attachments['tile.png'].length;
		emit([doc.maze_id, doc.creator], size/1000);
	} else if (doc.type == 'user-info') {
		emit(["1", doc.name], 0);
	}
}