function(keys, values, rereduce) {
	function unique(array) {
		var elems = {};
		return array.filter(function (elem) {
			return !(elem in elems) && (elems[elem] = true);
		});
	}

	if (values.some(function (value) {
		return value.length == 0;
	})) {
		return [];
	}
	var users = [].concat.apply([], values);
	return unique(users);
}
