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

//throw {forbidden: "name: '"+userCtx.name+"'"};

function (doc, oldDoc, userCtx) {
	
	validate([
		doc.type in {"maze":1}, "Document must be a valid type (maze).",
		
		userCtx.name, "User must be logged in."
	]);

	if (doc.type == "maze") {
		
		if (oldDoc && oldDoc.creator) {
			validate([
				doc.creator == oldDoc.creator, "Maze creator cannot be changed."
			]);
		}
		
		validate([

			doc.creator == userCtx.name ||
				userCtx.roles.indexOf('_admin') != -1,
 					"Maze can only be changed by its owner" +
 					" or an admin.",

			doc.title, "Maze must have a title.",

			isPoint(doc.start), "Maze must have a valid start.",

			doc.format in {"tiled":1}, "Maze must be in a valid format (tiled)."
		]);
		if (doc.format == "tiled") {
			validate([

				isPoint(doc.tile_size), "Maze must have a valid tile size.",

				isArray(doc.ends) &&
					doc.ends.every(isPointRadius),
						"Maze endings must be valid.",

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
		}
	}
}