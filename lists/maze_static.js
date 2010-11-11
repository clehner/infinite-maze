function replacePairs(text, replacement) {
	return text.split(replacement[0]).join(replacement[1]);
}

function(head, req) {
	// !json templates.maze_static
	
	function mazeNotFound(id) {
		//throw ['error', 'not_found', 'Maze not found. '+a];
		return "Maze not found!";
	}
	
	provides("html", function() {
		var mazeId = req.query.id;
		var maze;
		var tiles = {};
		var row;
		var xMin = Infinity;
		var yMin = Infinity;
		while (row = getRow()) {
			if (row.key != mazeId) continue;
			var value = row.value;
			
			if (!maze && value.maze) {
				maze = value.maze;
			}
			if (value.tiles) {
				var theseTiles = value.tiles;
				for (var x in theseTiles) {
					if (+x < xMin) xMin = +x;
					for (var y in theseTiles[x]) {
						if (+y < yMin) yMin = +y;
						(tiles[y] || (tiles[y] = {}))[x] = theseTiles[x][y];
					}
				}
			}
		}
		
		
		if (!maze) {
			return mazeNotFound(mazeId);
		}
		
		// Adjust tiles to start at 0, 0.
		var xOffset = -xMin;
		var yOffset = -yMin;
		
		var rows = [];
		for (var y in tiles) {
			var row1 = rows[+y + yOffset] || (rows[+y + yOffset] = []);
			for (var x in tiles[y]) {
				row1[+x + xOffset] = tiles[y][x];
			}
		}
		
		// Array.prototype.map does not work as I would like here.
		// (It doesn't iterate over null elements.)
		var tableHtml = rows.map(function (row) {
			var lines = [];
			for (var i = 0; i < row.length; i++) {
				var url = row[i];
				lines.push("<td>" +
					(url ? "<img src=\"../db/" + url + "/tile.png\">" : "")
					+ "</td>");
			};
			return "<tr>" + lines.join("") + "</tr>\n";
		}).join("");
		
		var tileWidth = maze.tile_size[0];
		var tileHeight = maze.tile_size[1];
		var replacements = [
			["{{TBODY}}", tableHtml],
			["{{TILE_WIDTH}}", tileWidth],
			["{{TILE_HEIGHT}}", tileHeight],
			["{{START_X}}", tileWidth * xOffset + maze.start[0]],
			["{{START_Y}}", tileHeight * yOffset + maze.start[1]]
		];
		
		// Array.prototype.reduce
		if(![].reduce)Array.prototype.reduce=function(e){if(this===void 0||this===null)throw new TypeError;var b=Object(this),d=b.length>>>0;if(typeof e!=="function")throw new TypeError;if(d==0&&arguments.length==1)throw new TypeError;var a=0,c;if(arguments.length>=2)c=arguments[1];else{do{if(a in b){c=b[a++];break}if(++a>=d)throw new TypeError;}while(1)}for(;a<d;){if(a in b)c=e.call(undefined,c,b[a],a,b);a++}return c};
		
		return replacements.reduce(replacePairs, templates["maze_static"]);
	});
}