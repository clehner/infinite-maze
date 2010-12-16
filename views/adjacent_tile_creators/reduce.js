function(keys, values, rereduce) {
	var users = {};
	var usersArray = [];
	var allUsers = rereduce ? [].concat.apply([], values) : values;
	allUsers.forEach(function (user) {
		if (!(user in users)) {
			users[user] = true;
			usersArray.push(user);
		}
	});
	return usersArray;
}