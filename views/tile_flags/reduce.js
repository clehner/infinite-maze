function(keys, values, rereduce) {
	var newest = -Infinity;
	var users = [];
	var location;
	var creator;
	values.forEach(function (value) {
		if (value.newest > newest)
			newest = value.newest;
		if (value.users)
			users.push.apply(users, value.users);
		if (value.location)
			location = value.location;
		if (value.creator)
			creator = value.creator;
	});
	return {
		location: location,
		creator: creator,
		newest: newest,
		users: users
	};
}
