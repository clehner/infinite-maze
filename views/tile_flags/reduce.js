function(keys, values, rereduce) {
	function unique(array) {
		var elems = {};
		return array.filter(function (elem) {
			return !(elem in elems) && (elems[elem] = true);
		});
	}

	var newest = -Infinity;
	var users = [];
	values.forEach(function (value) {
		if (value.newest > newest)
			newest = value.newest;
		if (value.users)
			users.push.apply(users, value.users);
	});
	return {
		newest: newest,
		users: unique(users).slice(0, 12)
	};
}
