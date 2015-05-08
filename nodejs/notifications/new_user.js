var sys = require('sys');

function sendNewUserEmail(api, user) {
	var name = user.name;
	var email = user.email;
	console.log("Sending welcome email to ", user, '<' + email + '>');
	api.mail.message({
		from: api.sender,
		to: '"' + name + '" <' + (api.debugAddress || email) + '>',
		subject: 'Welcome to the Infinite Maze!',
		'Content-Type': 'text/html'
	})
	.body(api.render('new_user.html', {
		name: name
	}))
	.send(function (er) {
		if (er) {
			sys.debug('Error to '+name+': '+er);
			throw er;
		}
		sys.debug('Sent welcome email!');
	});
}

function onNewUser(api, doc) {
	doc.emailed_welcome = true;
	api.saveDoc(doc, function (er, ok) {
		if (er || !ok) {
			sys.debug("Error: " + er + ", ok=" + ok + ", doc=" +
				JSON.stringify(doc));
			throw er;
		}
		api.queue(sendNewUserEmail, doc);
	});
}

module.exports = function(api) {
	api.changes("new_users", function (doc) {
		onNewUser(api, doc);
	});
};
