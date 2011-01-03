function (doc, req) {
	return (doc.type == "tile") &&
		!doc.emailed_neighbors &&
		doc.created_at > 1293725270810; // don't email old tiles
}