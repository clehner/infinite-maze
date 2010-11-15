function(head, req) {
	// !json templates.maze
	// !json templates.maze_currentdir
	
	function mazeNotFound(id) {
		//throw ['error', 'not_found', 'Maze not found. '+a];
		return "Maze not found!";
	}
	
	provides("html", function() {
		var mazeId = req.query.id;
		var maze;
		var tiles = {};
		var row;
		while (row = getRow()) {
			if (row.key != mazeId) continue;
			var value = row.value;
			
			if (!maze && value.maze) {
				maze = value.maze;
			}
			if (value.tiles) {
				var theseTiles = value.tiles;
				for (var x in theseTiles) {
					if (!tiles[x]) {
						tiles[x] = {};
					}
					for (var y in theseTiles[x]) {
						tiles[x][y] = row.id; //theseTiles[x][y];
					}
				}
			}
		}
		if (!maze) {
			return mazeNotFound(mazeId);
		}
		
		var data = {maze: maze, tiles: tiles};
		
		var template = req.query.currentdir ? "maze_currentdir" : "maze";
		return templates[template].replace("{{DATA}}", JSON.stringify(data));
	});
}