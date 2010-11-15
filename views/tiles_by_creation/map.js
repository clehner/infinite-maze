function pad(n) {
	return n < 10 ? "0" + n : n;
}
function(doc) {
	if (doc.type == "tile") {
		var d = new Date(doc.created_at);
		var date = d.getFullYear() + "-" + pad(d.getMonth()) + "-" + pad(d.getDate());
		var time = pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
		delete doc._id;
		delete doc._attachments;
		delete doc._rev;
		emit(date + " " + time, doc);
	}
}