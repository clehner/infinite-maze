function (doc) {
	if (doc.type == 'tile') {
		var size = doc._attachments['tile.png'].length;
		emit([doc.maze_id, doc.creator], [Math.max(size - 1665, 100)/1000, size/1000, 1]);
	} else if (doc.type == 'user-info') {
		emit(["1", doc.name], [0, 0, 0]);
	}
}
