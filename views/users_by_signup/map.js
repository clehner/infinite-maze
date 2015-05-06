function pad(n) {
	return n < 10 ? "0" + n : n;
}
function(doc) {
	if (doc.type == 'user-info') {
		var d = new Date(doc.signup);
		var date = d.getFullYear() + "-" + pad(d.getMonth()) + "-" + pad(d.getDate());
		var time = pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
		var datetime = date + " " + time;
		emit(datetime, doc.name);
	}
}
