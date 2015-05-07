function(doc) {
	if (doc.type == "tile-flag") {
		if (!doc.status) {
			emit([doc.tile_id].concat(doc.tile_location), {
				newest: doc.created_at,
				users: [doc.user]
			});
		}
	}
}
