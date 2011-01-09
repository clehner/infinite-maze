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
	
	//if (isAdmin) return;
	
	if (doc._deleted) {
		validate([
			isAdmin, "Only admin can delete stuff."
		]);
		return;
	}
		
	if (oldDoc && !isAdmin) {
		/*if (typeof oldDoc.created_at == "number") {
			validate([
				doc.created_at == oldDoc.created_at,
				"Creation date can not be changed except by admin."
				// unless it is invalid
			]);
		}*/
		if (doc.creator || oldDoc.creator) {
			validate([
				doc.creator == oldDoc.creator,
				"Creator cannot be changed except by admin."
			]);
		}
	}
	
	var type = doc.type;
	
	if (type == "maze") {
		// Maze validation
		
		validate([
			doc.creator == userCtx.name || isAdmin,
				"Maze can only be changed by its creator or an admin.",
			
			doc.title, "Maze must have a title.",

			isPoint(doc.start), "Maze must have a valid start.",

			typeof doc.created_at == "number",
				"created_at must be a unix timestamp."
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
	} else if (type == "tile") {
		// Tile validation
		validate([
			doc.creator == userCtx.name || isAdmin,
				"Tile can only be changed by its creator or an admin.",
			
			doc.maze_id,
				"Tile must have a maze_id.",
			
			isPoint(doc.location),
				"Tile must have valid location coordinates.",
			
			doc._attachments && doc._attachments['tile.png'],
				"Tile must have an attachment called 'tile.png'.",

			typeof doc.created_at == "number",
				"created_at must be a unix timestamp.",
				
			isAdmin || (!doc.emailed_neighbors ==
				!(oldDoc && oldDoc.emailed_neighbors)),
				"Only admin can say whether emails were sent."
		]);
		validate([
			doc._attachments['tile.png'].content_type == 'image/png',
				"Tile attachment must have mime-type 'image/png'.",
		]);
	} else if (type == "claim") {
		// Claim validation
		validate([
			doc.claim_type,
				"Claim type must be tile.",
			
			doc.tile_id,
				"Claim must have a tile_id.",
			
			doc.user == userCtx.name || isAdmin,
				"Claim must be for your own account.",

			typeof doc.created_at == "number",
				"created_at must be a unix timestamp."
		]);
	} else if (type == "user-info") {
		// User info
		validate([
			doc._id == "user-info:" + doc.name,
				"Id must be in the format user-info:{name}",
			
			doc.name,
				"User info must have a name.",
			
			typeof doc.signup == "number",
				"User info must have a signup timestamp.",
				
			isAdmin || (!doc.emailed_welcome ==
				!(oldDoc && oldDoc.emailed_welcome)),
				"Only admin can say whether emails were sent."
			
		]);
	} else if (type == "start-tiles") {
		// List of start tiles
		validate([
			isAdmin,
				"Only admin can edit the list of start tiles.",

			doc._id == "start-tiles:" + doc.maze_id,
				"Id must be in the format start_tiles:{maze_id}",
			
			isArray(doc.tiles) &&
				doc.tiles.every(isPoint),
					"There must be tiles in the list."
		]);
	} else {
		throw {forbidden:
			"Document must be a valid type (maze, tile, user-info, or claim)."};
	}
}