var sys = require('sys'),
	couchdb = require('./node-couchdb'),
	cred = require('./credentials');
	mail = require('./node-mail/lib/mail').Mail(cred.mail),
	client = couchdb.createClient(5984, cred.couchdb.host, 
		cred.couchdb.user, cred.couchdb.pass),
	db = client.db('maze'),
	debug = cred.true;

function saveDoc(doc, cb) {
	if (debug) cb();
	else return db.saveDoc(doc, cb);
}

db.changesStream({
	filter: 'maze/new_users_to_email'
}).addListener('data', function (change) {
	db.getDoc(change.id, function (er, doc) {
		if (er) throw er;
		doc.emailed_welcome = true;
		saveDoc(doc, function (er, ok) {
			if (er) throw er;
			sendNewUserEmail(doc);
		});
	});
});

db.changesStream({
	filter: 'maze/tiles_to_email'
}).addListener('data', function (change) {
	// Get the changed tile
	db.getDoc(change.id, function (er, doc) {
		if (er) throw er;
		// Get the usernames of the creators of the adjacent tiles.
		db.view("maze", "adjacent_tile_creators", {
			key: [doc.maze_id].concat(doc.location),
			group: true
		}, function (er, result) {
			if (er) throw er;
			var row = result.rows[0];
			if (row) {
				var usernames = row.value;
				// Update the tile doc so duplicate emails aren't sent later.
				doc.emailed_neighbors = true;
				saveDoc(doc, function (er, ok) {
					if (er) throw er;
					usernames.forEach(function (username) {
						// Don't notify a user of their own drawing.
						if (username != doc.creatora) {
							// Get the email address for a username
							db.view("maze", "user_emails", {
								key: username
							}, function (er, result) {
								if (er) throw er;
								var row = result.rows[0];
								if (row) {
									var email = row.value;
									// Send an email
									sendNewTileEmail(doc, username, email);
								}
							});
						}
					});
				});
			}
		});
	});
});

var debugAddress = debug && 'mazemaster.cel@lehnerstudios.com';
var sender = cred.mail.address;
var siteRoot = 'http://www.theinfinitemaze.com/';

function sendNewUserEmail(user) {
	var name = user.name;
	var email = user.email;
	sys.puts("Sending welcome email to " + email + ": " + JSON.stringify(user));
	mail.message({
		from: sender,
		to: '"' + name + '" <' + (debugAddress || email) + '>',
		subject: 'Welcome to the Infinite Maze!',
		'Content-Type': 'text/html'
	})
	.body('Welcome to the Infinite Maze!<br>\n' +
		'<a href="' + siteRoot + '">www.theinfinitemaze.com</a><br>\n<br>\n' +
		'You signed up with the username "' + name + '".<br>\n<br>\n' +
		'<img src="' + siteRoot + 'images/welcome-email-logo.png" alt="TheInfiniteMaze.com">')
	.send(function (er) {
		if (er) throw er;
		sys.debug('Sent!');
	});
}

function sendNewTileEmail(tile, username, email) {
	sys.puts("Sending new email to " + username + ": " + JSON.stringify(tile));
	var link = siteRoot + '#' + tile.location.join(',');
	mail.message({
		from: sender,
		to: '"' + username + '" <' + (debugAddress || email) + '>',
		subject: 'New maze drawing',
		'Content-Type': 'text/html'
	})
	.body('Hi ' + username + ',<br>\n<br>\n' +
		'"' + tile.creator + '" ' +
		'drew something next to one of your drawings. ' +
		'<a href="' + link + '">See what they drew.</a><br>\n<br>\n' +
		'- TheInfiniteMaze.com')
	.send(function (er) {
		if (er) throw er;
		sys.debug('Sent!');
	});
}
