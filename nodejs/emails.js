var sys = require('sys'),
	couchdb = require('felix-couchdb'),
	cred = require('./credentials'),
	mail = require('mail').Mail(cred.mail),
	couch = couchdb.createClient(cred.couchdb.port || 5984,
		cred.couchdb.host, cred.couchdb.user, cred.couchdb.pass,
		NaN, cred.couchdb.secure),
	db = couch.db('maze'),
	debug = cred.debug,
	wait = 4000, // ms in between emails
	update_seq = ~~process.argv[2];

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
	sys.debug("Queueing message: " + JSON.stringify(args));
	_queued.push([func, args]);
	if (!queueing) {
		queueing = true;
		sendLatest();
	}
}

// db stuff

function saveDoc(doc, cb) {
	if (debug) cb && cb(null, true);
	else return db.saveDoc(doc, cb);
}

function removeDoc(doc, cb) {
	if (debug) cb && cb(null, true);
	else return db.removeDoc(doc, cb);
}

function changes(name, handler) {
	console.log('opening changes stream', name);
	db.changesStream({
		filter: "maze/" + name,
		include_docs: true,
		since: update_seq
	}).addListener("data", function (change) {
		console.log('change', change.seq, change.doc && change.doc.type);
		handler(change.doc);
	}).addListener("error", function (msg) {
		sys.debug("Error: " + msg);
	}).addListener("end", function () {
		sys.debug("Changes ended (" + name + "). Retrying.");
		changes(name, handler);
	});
}

function getUserEmail(username, cb) {
	db.view("maze", "user_emails", {key: username}, function (er, result) {
		if (er) {
			cb(er, null, null);
			return;
		}
		var row = result.rows[0];
		if (!row) {
			sys.debug("No email found for username '" + username + "'.");
			return;
		}
		var email = row.value[0];
		var prefs = {
			receive_tile_notifications: !!row.value[1]
		};
		cb(null, email, prefs);
	});
}

changes("new_users", function (doc) {
	doc.emailed_welcome = true;
	saveDoc(doc, function (er, ok) {
		if (er || !ok) {
			sys.debug("Error: " + er + ", ok=" + ok + ", doc=" + JSON.stringify(doc));
			throw er;
		}
		queue(sendNewUserEmail, doc);
	});
});

changes("tiles_to_email", function (doc) {
	// Get the changed tile
	// Get the usernames of the creators of the adjacent tiles.
	db.view("maze", "adjacent_tile_creators", {
		key: [doc.maze_id].concat(doc.location),
		group: true
	}, function (er, result) {
		if (er || !result || !result.rows) {
			console.error("Unable to get adjacent tile creators:", er,
				result);
			return;
		}
		var row = result.rows[0];
		if (!row) return;
		var usernames = row.value;
		// Update the tile doc so duplicate emails aren't sent later.
		doc.emailed_neighbors = true;
		saveDoc(doc, function (er, ok) {
			if (er) {
				sys.debug("Error updating doc " + JSON.stringify(doc));
				return;
			}
			usernames.forEach(function (username) {
				// Don't notify a user of their own drawing.
				if (username != doc.creator) {
					// Get the email address for a username
					getUserEmail(username, function (er, email, prefs) {
						if (er) throw er;
						if (prefs.receive_tile_notifications) {
							// Send the email
							queue(sendNewTileEmail, doc, username, email);
						}
					});
				}
			});
		});
	});
});

// password stuff

var crypto = require('crypto');
function hex_hmac_sha1(key, data) {
	var hmac = crypto.createHmac('sha1', key);
	hmac.update(data);
	return hmac.digest('hex');
}

function getUserDoc(username, cb) {
	userDb.getDoc('org.couchdb.user:' + username, cb);
}

function makePasswordResetToken(requestDoc, cb) {
	getUserDoc(requestDoc.user, function (er, userDoc) {
		if (er || !userDoc) {
			console.error('unable to get user doc:', er, userDoc);
			return;
		}
		var data = requestDoc._id + "-" + userDoc._rev;
		cb(hex_hmac_sha1(cred.password_reset_secret, data));
	});
}

var userDb = couch.db('_users');
function changePassword(username, password_sha, salt, cb) {
	getUserDoc(username, function (er, doc) {
		if (er) return cb(er);
		doc.password_sha = password_sha;
		doc.salt = salt;
		userDb.saveDoc(doc, cb);
	});
}

changes("password_reset_requests", function (doc) {
	var reqId = doc._id;
	if (doc._deleted || // request is finished
		(doc.emailed && !doc.token)) { // waiting for user to click link.
			return;
	}
	function finishDoc() {
		saveDoc(doc, function (er, ok) {
			if (er || !ok) {
				sys.debug("Error finishing password reset doc. id = " +
					reqId + ", er = " + JSON.stringify(er));
			}
		});
	}
	if (doc.expires < Date.now()) {
		sys.debug("Attempt to use an expired password reset." + reqId);
		removeDoc(doc, function (er, ok) {
			if (er) {
				sys.debug("Error deleting password reset req doc. id = " +
					reqId + ". er = " + JSON.stringify(er));
			} else {
				sys.debug("Deleted expired pass reset doc. (id=" + reqId +
					"). " + JSON.stringify(ok));
			}
		});
		return;
	}
	if (doc.done || (doc.token && (doc.failed_token == doc.token))) {
		// nothing to do here
		return;
	}
	var user = doc.user;
	makePasswordResetToken(doc, function (token) {
		if (!doc.emailed) {
			// send out email
			doc.emailed = true;
			getUserEmail(doc.user, function (er, email) {
				if (er) throw er;
				saveDoc(doc, function (er, ok) {
					if (er) {
						sys.debug("Error updating password req doc " +
							JSON.stringify([er, doc]));
						return;
					}
					queue(sendPasswordResetEmail, user, email, reqId, token);
				});
			});
		} else if (doc.token) {
			// the user has clicked the link and entered their new password.
			
			if (doc.token != token) {
				sys.debug("Incorrect password reset token. Req id = " + reqId);
				doc.failed_token = doc.token;
				finishDoc();
				return;
			}
			changePassword(user, doc.password_sha, doc.salt, function (er, ok) {
				if (er) {
					sys.debug("Error changing password in user doc. Req doc: " +
						JSON.stringify(doc));
					return;
				}
				// mark the request as done
				sys.debug("Success changing password for " + user);
				doc.done = true;
				finishDoc();
			});
		}
	});
});

// sending the mails

var debugAddress = debug && 'theinfinitemaze-debug.cel@celehner.com';
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
	//.body('Welcome to The Infinite Maze, the collaborative maze drawing site!<br><br>Your username is "' + name + '". You signed up a while ago, but this is your official welcome email.<br><br>New features added recently:<br><br>- <b>More colors</b> to choose from. And a bucket tool.<br>- <b>You don\'t have to start over.</b> When you come back to the site, you now continue from where you were last time.<br>- <b>Teleport to your tiles</b> - You can now jump directly to any tile you have drawn. Just scroll to it and then click the green circle to teleport to it.<br><br>Have fun!<br><br><a href="' + siteRoot + '">www.theinfinitemaze.com<br><br><img src="' + siteRoot + 'images/welcome-email-logo.png" alt="TheInfiniteMaze.com"></a>')
	.body('Welcome to The Infinite Maze, the collaborative maze drawing site.<br><br>You signed up with the username "' + name + '".<br><br>Have fun!<br><br><a href="' + siteRoot + '">www.theinfinitemaze.com<br><br><img src="' + siteRoot + 'images/welcome-email-logo.png" alt="TheInfiniteMaze.com"></a>')
	//.body('Welcome to The Infinite Maze, the collaborative maze drawing site.<br><br>You signed up with the username "' + name + '".<br><br>Have fun! (This is a test)')
	.send(function (er) {
		if (er) {
			sys.debug('Error to '+name+': '+er);
			throw er;
		}
		sys.debug('Sent welcome email!');
	});
}

function sendNewTileEmail(tile, username, email) {
	sys.puts("Sending new tile email to " + username + (debug ? " (debug)" : "")
		+ ": " + JSON.stringify(tile));
	var link = siteRoot + '#' + tile.location.join(',');
	mail.message({
		from: sender,
		to: '"' + username + '" <' + (debugAddress || email) + '>',
		subject: 'New maze drawing',
		'Content-Type': 'text/html'
	})
	.body('Hi ' + username + ',<br><br>"' + tile.creator + '" drew something next to one of your drawings in the maze.<br><br><a href="' + link + '">See what they drew.</a><br><br>-TheInfiniteMaze.com')
	.send(function (er) {
		if (er) {
			sys.debug('Error on tile to '+username+': '+er);
			throw er;
		}
		sys.debug('Sent tile email!');
	});
}

function sendPasswordResetEmail(username, email, requestId, token) {
	sys.puts("Sending password reset email to " + username + (debug ? " (debug)"
		: "") + ". request id = " + requestId);
	var link = siteRoot + 'reset_password.html?id=' + requestId + '&token=' + token;
	mail.message({
		from: sender,
		to: '"' + username + '" <' + (debugAddress || email) + '>',
		subject: 'Password reset request'
	})
	.body('Someone has requested to reset your password on the Infinite Maze. To pick a new password, click the link below.\n\n' + link + '\n\nYour username: ' + username + '\n\nIf this is a mistake, just ignore this email. The link will expire in 12 hours.')
	.send(function (er) {
		if (er) {
			sys.debug('Error sending pass reset email to '+username+': '+er);
			throw er;
		}
		sys.debug('Sent password reset request!');
	});
}
