function(doc) {
	if (doc.type == 'user-info') {
		emit(doc.email, doc.name);
	}
}