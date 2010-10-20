function(head, req) {
	// !json templates.maze
	
	//req.query
	//var maze = row.value.maze;
	//var tiles = row.value.tiles;
	
	function fail(a) {
		send('nothing. '+a);
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
		return templates.maze.replace("{{DATA}}", data);
	});
}