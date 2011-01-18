function (doc) {
	if (doc.type == 'user-info' && !doc.opt_out_emails) {
		emit(doc.name, doc.email);
	}
}