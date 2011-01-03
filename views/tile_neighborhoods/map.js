function (doc) {
	if (doc.type == 'tile') {
		var m = doc.maze_id;
		var x = doc.location[0];
		var y = doc.location[1];
		if (!this.no_start) {
			// self
			emit([m, x, y], [1, 0, 0]);
		}
		
		// 8-connected cells
		
		emit([m, x-1, y-1], [0, 1, 0]);
		emit([m, x,   y-1], [0, 1, 0]);
		emit([m, x+1, y-1], [0, 1, 0]);
		
		emit([m, x-1, y+1], [0, 1, 0]);
		emit([m, x,   y+1], [0, 1, 0]);
		emit([m, x+1, y+1], [0, 1, 0]);

		emit([m, x-1, y], [0, 1, 0]);
		emit([m, x+1, y], [0, 1, 0]);

		// 12 cells, ~2 away on a circle
		
		emit([m, x-1, y-2], [0, 0, 1]);
		emit([m, x,   y-2], [0, 0, 1]);
		emit([m, x+1, y-2], [0, 0, 1]);
		
		emit([m, x-1, y+2], [0, 0, 1]);
		emit([m, x,   y+2], [0, 0, 1]);
		emit([m, x+1, y+2], [0, 0, 1]);
		
		emit([m, x-2, y-1], [0, 0, 1]);
		emit([m, x-2, y  ], [0, 0, 1]);
		emit([m, x-2, y+1], [0, 0, 1]);
		
		emit([m, x+2, y-1], [0, 0, 1]);
		emit([m, x+2, y  ], [0, 0, 1]);
		emit([m, x+2, y+1], [0, 0, 1]);
	}
}