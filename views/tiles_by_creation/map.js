function(doc) {
	function pad(n) {
		return n < 10 ? "0" + n : n;
	}

	if (doc.type == "tile") {
		var d = new Date(doc.created_at);
		var date = d.getFullYear() + "-" + pad(d.getMonth()) + "-" + pad(d.getDate());
		var time = pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
		emit(date + " " + time, null);
	}
}
