function (doc, req) {
	return (doc.type == "user-info") &&
		!doc.emailed_welcome;
}