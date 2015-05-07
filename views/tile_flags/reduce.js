function(keys, values, rereduce) {
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
		users: users
	};
}
