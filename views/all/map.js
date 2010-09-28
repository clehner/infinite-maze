function (doc) {
	if (doc.type == 'maze') {
		emit(null, {
			id: doc._id,
			title: doc.title,
			creator: doc.creator
		});
	}
}