function uniq(array) {
	var elems = {};
	return array.filter(function (elem) {
		return !(elem in elems) && (elems[elem] = true);
	});
}

function(keys, values, rereduce) {
	if (values.some(function (value) {
		return value.length == 0;
	})) {
		return [];
	}
	var users = [].concat.apply([], values);
	return uniq(users);
}