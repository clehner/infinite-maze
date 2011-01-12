var sys = require('sys'),
	couchdb = require('./node-couchdb'),
	cred = require('./credentials');
	mail = require('./node-mail/lib/mail').Mail(cred.mail),
	client = couchdb.createClient(cred.couchdb.port || 5984, cred.couchdb.host, 
		cred.couchdb.user, cred.couchdb.pass),
	db = client.db('maze'),
	debug = cred.debug,
	wait = 4000; // ms in between emails

// queuing sending mails

var _queued = [];
var queueing = false;
function sendLatest() {
	var args = _queued.pop();
	if (args) {
		setTimeout(sendLatest, wait);
		args[0].apply(null, args[1]);
	} else {
		queueing = false;
	}
}
function queue(func /*, args... */) {
	var args = Array.prototype.slice.call(arguments, 1);
	sys.debug("Queueing message.");
	_queued.push([func, args]);
	if (!queueing) {
		queueing = true;
		sendLatest();
	}
}

// db stuff

function saveDoc(doc, cb) {
	if (debug) cb();
	else return db.saveDoc(doc, cb);
}

db.changesStream({
	filter: 'maze/new_users_to_email',
	include_docs: true
}).addListener('data', function (change) {
	var doc = change.doc;
	doc.emailed_welcome = true;
	saveDoc(doc, function (er, ok) {
		if (er) throw er;
		queue(sendNewUserEmail, doc);
	});
});

db.changesStream({
	filter: 'maze/tiles_to_email',
	include_docs: true
}).addListener('data', function (change) {
	// Get the changed tile
	var doc = change.doc;
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
					if (username != doc.creator) {
						// Get the email address for a username
						db.view("maze", "user_emails", {
							key: username
						}, function (er, result) {
							if (er) throw er;
							var row = result.rows[0];
							if (row) {
								var email = row.value;
								// Send an email
								queue(sendNewTileEmail, doc, username, email);
							}
						});
					}
				});
			});
		}
	});
});

// sending the mails

var debugAddress = debug && 'theinfinitemaze-debug.cel@lehnerstudios.com';
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
	//.body('Welcome to The Infinite Maze, the collaborative maze drawing site!<br><br>Your username is "' + name + '". You signed up a while ago, but this your official welcome email.<br><br>New features added recently:<br><br>- <b>More colors</b> to choose from. And a bucket tool.<br>- <b>You don\'t have to start over.</b> When you come back to the site, you now continue from where you were last time.<br>- <b>Teleport to your tiles</b> - You can now jump directly to any tile you have drawn. Just scroll to it and then click the green circle to teleport to it.<br><br>Have fun!<br><br><a href="' + siteRoot + '">www.theinfinitemaze.com<br><br><img src="' + siteRoot + 'images/welcome-email-logo.png" alt="TheInfiniteMaze.com"></a>')
	.body('Welcome to The Infinite Maze, the collaborative maze drawing site.<br><br>You signed up with the username "' + name + '".<br><br>Have fun!<br><br><a href="' + siteRoot + '">www.theinfinitemaze.com<br><br><img src="' + siteRoot + 'images/welcome-email-logo.png" alt="TheInfiniteMaze.com"></a>')
	.send(function (er) {
		if (er) {
			sys.debug('Error to '+username+': '+er);
			throw er;
		}
		sys.debug('Sent!');
	});
}

function sendNewTileEmail(tile, username, email) {
	sys.puts("Sending new tile email to " + username + (debug ? " (debug)" : "")
		+ ": " + JSON.stringify(tile));
	var link = siteRoot + '#' + tile.location.join(',');
	var creator = tile.creator ? '"' + tile.creator + '"' : 'Someone';
	mail.message({
		from: sender,
		to: '"' + username + '" <' + (debugAddress || email) + '>',
		subject: 'New maze drawing',
		'Content-Type': 'text/html'
	})
	.body('Hi ' + username + ',<br><br>' + creator + ' drew something next to one of your drawings in the maze.<br><br><a href="' + link + '">See what they drew.</a><br><br>-TheInfiniteMaze.com')
	.send(function (er) {
		if (er) {
			sys.debug('Error on tile to '+username+': '+er);
			throw er;
		}
		sys.debug('Sent!');
	});
}
