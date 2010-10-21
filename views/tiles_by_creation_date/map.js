function(doc) {
	if (doc.type == "tile") {
		emit(doc.created_at, doc);
	}
}