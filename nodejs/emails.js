var sys = require('sys'),
	cred = require('./credentials'),
	reconSmtp = require('./reconnecting-smtp-client')(cred.mail),
	fs = require("fs"),
	mustache = require('mustache'),
	nano = require('nano')(cred.couchdb),
	db = nano.use('maze'),
	usersDb = nano.use('_users'),
	debug = cred.debug,
	wait = 4000, // ms in between emails
	update_seq = ~~process.argv[2] || 'now',
	siteRoot = 'http://www.theinfinitemaze.com/';

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
	if (!debug) db.insert(doc, cb);
	else if (cb) cb(null, true);
}

function removeDoc(doc, cb) {
	if (!debug) db.destroy(doc._id, doc._rev, cb);
	else if (cb) cb(null, true);
}

function changes(name, handler) {
	console.log('opening changes stream', name);
	db.follow({
		filter: "maze/" + name,
		include_docs: true,
		since: update_seq
	}, function (err, change) {
		if (err) {
			console.error('changes:', err);
			return;
		}
		console.log('change seq ', change.seq, 'id', change.id);
		handler(change.doc);
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

function getUserDoc(username, cb) {
	db.get('org.couchdb.user:' + username, cb);
}

var templates = {};
function render(templateName, data) {
	var template = templates[templateName] || (templates[templateName] =
		fs.readFileSync('templates/' + templateName, 'utf8'));
	// specify template default values
	var obj = {
		siteRoot: siteRoot,
		sender_name: cred.mail.sender_name,
		sender_address: cred.mail.sender_address,
	};
	for (var key in data)
		obj[key] = data[key];
	return mustache.render(template, obj);
}

function getTileUrl(location) {
	return siteRoot + '#' + location.join(',');
}

function mimeBoundary() {
	return '========' + Math.random().toString(36).substr(2) + '==';
}

function mailDate() {
	return new Date().toLocaleString();
}

function sendMail(to, msg, cb) {
	reconSmtp.send({
		from: cred.mail.sender_address,
		to: to
	}, msg, function (err, info) {
		if (info.rejected.length) {
			console.error("Some emails rejected:", info.rejected,
				"Response:", info.response);
		}
		cb(err);
	});
}

// sending the mails

var api = {
	cred: cred,
	debugAddress: debug && 'theinfinitemaze-debug.cel@celehner.com',
	siteRoot: siteRoot,
	changes: changes,
	getUserEmail: getUserEmail,
	getUserDoc: getUserDoc,
	saveDoc: saveDoc,
	removeDoc: removeDoc,
	queue: queue,
	db: db,
	sendMail: sendMail,
	usersDb: usersDb,
	render: render,
	mimeBoundary: mimeBoundary,
	mailDate: mailDate,
	getTileUrl: getTileUrl,
};

require('./notifications/flagged_tiles')(api);
require('./notifications/new_neighbors')(api);
/*
require('./notifications/new_user')(api);
require('./notifications/password_reset')(api);
*/
