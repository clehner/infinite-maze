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
			} else if (value.length == 2) {
				var x = value[0];
				var y = value[1];
				(tiles[x] || (tiles[x] = {}))[y] = row.id;
			}
		}
		if (!maze) {
			return mazeNotFound(mazeId);
		}
		
		var data = {maze: maze, tiles: tiles, userCtx: req.userCtx};
		
		var template = req.query.currentdir ? "maze_currentdir" : "maze";
		return templates[template].replace("{{DATA}}", JSON.stringify(data));
	});
}