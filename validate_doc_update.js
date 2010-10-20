function validate(conditions) {
	for (var i = 0; i < conditions.length; i++) {
		if (!conditions[i++]) {
			throw {forbidden: conditions[i]};
		}
	}
}

function isArray(obj) {
	return Object.prototype.toString.call(obj) == "[object Array]";
}

function isVector(obj, dimensions) {
	return isArray(obj) &&
		obj.length == dimensions &&
		!obj.some(isNaN);
}

function isPoint(obj) {
	return isVector(obj, 2);
}

function isPointRadius(obj) {
	return isVector(obj, 3);
}

function (doc, oldDoc, userCtx) {
	// Generic validation
	
var isAdmin = userCtx.roles.indexOf('_admin') != -1;

	if (!userCtx.name) {
		throw {unauthorized: "You must be logged in."};
	}
	
	if (doc._deleted) {
		validate([
			isAdmin, "Only admin can delete stuff."
		]);
		return;
	}
	
	validate([
		doc.type in {"maze":1, "tile": 1},
		"Document must be a valid type (maze or tile)."
	]);
	
	if (oldDoc) {
		if (typeof oldDoc.created_at == "number") {
			validate([
				doc.created_at == oldDoc.created_at,
				"Creation date can not be changed." // unless it is invalid
			]);
		}
		if (oldDoc.creator) {
			validate([
				doc.creator == oldDoc.creator,
				"Maze creator cannot be changed." // unless it is not set
			]);
		}
	}
	
	validate([
		typeof doc.created_at == "number",
		"created_at must be a unix timestamp."
	]);
	

	if (doc.type == "maze") {
		// Maze validation
		
		validate([
			doc.creator == userCtx.name || isAdmin,
				"Maze can only be changed by its creator" +
				" or an admin.",
			
			doc.title, "Maze must have a title.",

			isPoint(doc.start), "Maze must have a valid start."
		]);
		
		if (doc.format == "tiled") {
			// Tiled maze validation
			// This format has the tiles as attachments to the maze doc.
			validate([

				isPoint(doc.tile_size), "Maze must have a valid tile size.",

				isArray(doc.ends) &&
					doc.ends.every(isPointRadius),
						"Maze endings must be valid coordinates.",

				doc.tiles, "Maze must have tiles."
			]);
			
			var attachments = doc._attachments;
			if (attachments) {
				var tileNames = {};
				for (var y in doc.tiles) {
					var row = doc.tiles[y];
					for (var x in row) {
						var tile = row[x];
						tileNames[tile] = true;
					}
				}
				for (var file in attachments) {
					validate([
						file in tileNames,
						'Attachment "' + file + '" must be a tile.'
					]);
				}
			}
		} else if (doc.format == "infinite-tiled") {
			// Infinite tiled maze.
			// Tile images are attached to separate tile documents.
			validate([
				isPoint(doc.tile_size), "Maze must have a valid tile size."
			]);
			
		} else {
			throw {forbidden: "Maze must be in a valid format (tiled)."};
		}
	} else if (doc.type == "tile") {
		// Tile validation
		validate([
			doc.maze_id,
				"Tile must have a maze_id.",
			
			isPoint(doc.location),
				"Tile must have valid location coordinates.",
			
			doc._attachments && doc._attachments['tile.png'],
				"Tile must have an attachment called 'tile.png'."
		]);
	}
}