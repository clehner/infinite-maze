function (doc) {
	if (doc.type == 'user-info') {
		emit(doc.name, [doc.email, !doc.opt_out_emails]);
	}
}