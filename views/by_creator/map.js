function (doc) {
	if (doc.type == 'maze') {
		emit(doc.creator, {
			id: doc._id,
			title: doc.title
		});
	}
}