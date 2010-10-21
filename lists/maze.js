function(head, req) {
	// !json templates.maze
	// !json templates.maze_currentdir
	
	//req.query
	//var maze = row.value.maze;
	//var tiles = row.value.tiles;
	
	function fail(a) {
		throw ['error', 'not_found', 'Maze not found. '+a];
	}
	
	provides("html", function() {
		var queryId = req.query.id;
		var mazeId;
		do {
			var row = getRow();
			if (!row) return fail(mazeId + ',' + queryId);
			var value = row.value;
			var mazeId = value.maze._id;
		} while (mazeId != queryId);
		
		var data = JSON.stringify(value);
		
		var template = req.query.currentdir ? "maze_currentdir" : "maze";
		return templates[template].replace("{{DATA}}", data);
	});
}