function(keys, values, rereduce) {
	var result = values.shift() || [0, 0, 0];
	for (var i = 0; i < values.length; i++) {
		var value = values[i];
		result[0] += value[0];
		result[1] += value[1];
		result[2] += value[2];
	}
	return result;
}
