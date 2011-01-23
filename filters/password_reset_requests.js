function (doc, req) {
	var reqId = req.query.id;
	return (doc.type == "password-reset-request") &&
		 (!reqId || (reqId == doc._id));
}