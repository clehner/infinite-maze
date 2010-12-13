function(doc) {
	if (doc.type == "claim") {
		emit(doc.created_at, doc);
	}
}