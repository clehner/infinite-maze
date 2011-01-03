function(keys, values, rereduce) {
	var result = [0, 0, 0];
	values.forEach(function (value) {
		value.forEach(function (subvalue, i) {
			result[i] += subvalue;
		});
	});
	return result;
}