function (doc) {
	if (doc.type == 'tile') {
		var creator = doc.creator;
		if (creator) {
			var id = doc.maze_id;
			var x = doc.location[0];
			var y = doc.location[1];
			emit([id, x, y+1], [creator]);
			emit([id, x+1, y], [creator]);
			emit([id, x-1, y], [creator]);
			emit([id, x, y-1], [creator]);
			if (doc.emailed_neighbors) {
				emit([id, x, y], []);
			}
		}
	}
}