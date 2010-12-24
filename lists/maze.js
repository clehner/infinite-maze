function(head, req) {
	provides("text", function() {
		var maze, row, location;
		var tiles = {};
		while (row = getRow()) {
			var value = row.value;
			if (!maze && value.maze) {
				maze = value.maze;
			} else if (location = value.location) {
				var x = location[0];
				var y = location[1];
				value.id = row.id;
				(tiles[x] || (tiles[x] = {}))[y] = value;
			}
		}
		/*
		if (!maze) {
			//throw ['error', 'not_found', 'Maze not found. '+a];
		}
		*/
		
		var data = {
			maze: maze,
			tiles: tiles,
			userCtx: req.userCtx,
			update_seq: req.info.update_seq
		};
		
		return JSON.stringify(data);
	});
}