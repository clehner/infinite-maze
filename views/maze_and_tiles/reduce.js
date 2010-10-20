function(keys, values, rereduce) {
	var maze, tiles;
	for (var i = 0; i < values.length; i++) {
		var value = values[i];
		if (value.maze) {
			maze = value.maze;
		}
		if (value.tiles) {
			if (tiles) {
				for (var x in value.tiles) {
					if (!tiles[x]) {
						tiles[x] = {};
					}
					for (var y in value.tiles[x]) {
						tiles[x][y] = value.tiles[x][y];
					}
				}
			} else {
				tiles = value.tiles;
			}
		}
	}
	return {maze: maze, tiles: tiles};
}