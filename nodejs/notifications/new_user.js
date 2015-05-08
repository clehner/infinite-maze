function sendNewUserEmail(api, user, cb) {
	console.log("Sending welcome email to ", user.name,
		'<' + user.email + '>');
	api.sendMail([user.email], api.render('new_user.txt', {
		user: {
			name: user.name,
			address: user.email
		},
		boundary: api.mimeBoundary()
	}), cb);
}

function onNewUser(api, doc) {
	var name = doc.name;
	api.queue(sendNewUserEmail, api, doc, function(er) {
		if (er) {
			console.error('Error welcoming', name, er);
			return;
		}
		console.log('Sent welcome email to', name);
		doc.emailed_welcome = true;
		api.saveDoc(doc, function (er, ok) {
			if (er || !ok) {
				console.error("Error saving user doc", er, ok, doc);
				return;
			}
			console.log('Saved user doc for ', name);
		});
	});
}

module.exports = function(api) {
	api.changes("new_users", function (doc) {
		onNewUser(api, doc);
	});
};
