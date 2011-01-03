function(head, req) {
	provides("text", function() {
		var row, points = [];
		while (row = getRow()) {
			var neighbors = row.value;
			if (neighbors[0] == 1 && // the cell must exist
				neighbors[1] == 8 && // it must have 8 adjacent neighbors
				neighbors[2] < 12) { // must have at least one empty cell nearby
				
				var point = [row.key[1], row.key[2]];
				points.push(point);
			}
		}

		return JSON.stringify(points);
	});
}