function (doc, req) {
	return (doc.type == "tile") &&
		!doc.emailed &&
		doc.created_at > 1292446326058; // don't email old tiles
}