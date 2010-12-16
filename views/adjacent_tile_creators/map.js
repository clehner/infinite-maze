function (doc) {
	if (doc.type == 'tile') {
		var creator = doc.creator;
		if (creator) {
			var x = doc.location[0];
			var y = doc.location[1];
			emit([doc.maze_id, x, y+1], creator);
			emit([doc.maze_id, x+1, y], creator);
			emit([doc.maze_id, x-1, y], creator);
			emit([doc.maze_id, x, y-1], creator);
		}
	}
}