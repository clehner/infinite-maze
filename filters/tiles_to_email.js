function (doc, req) {
	return (doc.type == "tile") &&
		!doc.emailed_neighbors &&
		doc.created_at > 1292446326058; // don't email old tiles
}