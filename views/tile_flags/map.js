function(doc) {
	switch (doc.type) {
		case "tile-flag":
			if (!doc.status) {
				emit(doc.tile_id, {
					newest: doc.created_at,
					users: [doc.user]
				});
			}
			break;
		case "tile":
			emit(doc._id, {
				location: doc.location,
				creator: doc.creator
			});
			break;
	}
}
