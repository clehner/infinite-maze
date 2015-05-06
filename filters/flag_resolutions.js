function (doc, req) {
	return doc.type == "tile-flag" && doc.status && !doc._deleted;
}
