var sys = require('sys'),
	cred = require('./credentials'),
	fs = require("fs"),
	mail = require('mail').Mail(cred.mail),
	mustache = require('mustache'),
	nano = require('nano')(cred.couchdb),
	db = nano.use('maze_dev'),
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
	if (!debug) db.destroy(doc, cb);
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
		fs.readFileSync('templates/' + templateName, 'ascii'));
	// specify template default values
	var obj = {
		siteRoot: siteRoot,
	};
	for (var key in data)
		obj[key] = data[key];
	return mustache.render(template, obj);
}

function getTileUrl(tile) {
	return siteRoot + '#' + tile.location.join(',');
}

function mimeBoundary() {
	return '========' + Math.random().toString(36).substr(2) + '==';
}

// sending the mails

var api = {
	cred: cred,
	sender: cred.mail.sender,
	debugAddress: debug && 'theinfinitemaze-debug.cel@celehner.com',
	siteRoot: siteRoot,
	changes: changes,
	getUserEmail: getUserEmail,
	getUserDoc: getUserDoc,
	saveDoc: saveDoc,
	removeDoc: removeDoc,
	queue: queue,
	db: db,
	mail: mail,
	usersDb: usersDb,
	render: render,
	mimeBoundary: mimeBoundary,
	getTileUrl: getTileUrl,
};

require('./notifications/flagged_tiles')(api);
/*
require('./notifications/new_user')(api);
require('./notifications/new_neighbors')(api);
require('./notifications/password_reset')(api);
*/
