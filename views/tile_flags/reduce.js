function(keys, values, rereduce) {
	var newest = -Infinity;
	var users = [];
	var location;
	values.forEach(function (value) {
		if (value.newest > newest)
			newest = value.newest;
		if (value.users)
			users.push.apply(users, value.users);
		if (value.location)
			location = value.location;
	});
	return {
		location: location,
		newest: newest,
		users: users
	};
}
