var crypto = require('crypto');

function hex_hmac_sha1(key, data) {
	var hmac = crypto.createHmac('sha1', key);
	hmac.update(data);
	return hmac.digest('hex');
}

function makePasswordResetToken(api, requestDoc, cb) {
	api.getUserDoc(requestDoc.user, function (er, userDoc) {
		if (er || !userDoc) {
			console.error('unable to get user doc:', er, userDoc);
			return;
		}
		var data = requestDoc._id + "-" + userDoc._rev;
		cb(hex_hmac_sha1(api.config.password_reset_secret, data));
	});
}

function changePassword(api, username, password_sha, salt, cb) {
	api.getUserDoc(username, function (er, doc) {
		if (er) return cb(er);
		doc.password_sha = password_sha;
		doc.salt = salt;
		api.usersDb.insert(doc, cb);
	});
}

function prepareSendPasswordResetEmail(api, doc, token) {
	api.getUserEmail(doc.user, function (er, email) {
		if (er) {
			console.error('Error getting user email for', doc.user);
			return;
		}
		api.queue(sendPasswordResetEmail, api, doc.user, email,
				doc._id, token, function () {
			doc.emailed = true;
			api.saveDoc(doc, function (er) {
				if (er) {
					console.error("Error updating " +
						"password req doc", er, doc);
					return;
				}
			});
		});
	});
}

function sendPasswordResetEmail(api, username, email, requestId, token, cb) {
	console.log("Sending password reset email to " + username +
		(api.debug ? " (debug)" : "") + ". request id = " + requestId);
	api.sendMail([email], api.render('password_reset.txt', {
		user: {
			name: username,
			address: email
		},
		link: api.siteRoot + 'reset_password.html?id=' + requestId +
			'&token=' + token
	}), function (er) {
		if (er) {
			console.error('Error sending pass reset email to', username, er);
			return;
		}
		console.log('Sent password reset request');
		cb();
	});
}

function onPasswordResetRequest(api, doc) {
	var reqId = doc._id;
	if (doc._deleted || // request is finished
		(doc.emailed && !doc.token)) { // waiting for user to click link.
			return;
	}
	function finishDoc() {
		api.saveDoc(doc, function (er, ok) {
			if (er || !ok) {
				console.error("Error finishing password reset doc. id = " +
					reqId + ", er = " + JSON.stringify(er));
			}
		});
	}

	if (doc.expires < Date.now()) {
		console.log("Attempt to use an expired password reset." + reqId);
		api.removeDoc(doc, function (er, ok) {
			if (er) {
				console.error("Error deleting password reset req doc. id = " +
					reqId + ". er = " + JSON.stringify(er));
			} else {
				console.log("Deleted expired pass reset doc. (id=" + reqId +
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
	makePasswordResetToken(api, doc, function (token) {
		if (!doc.emailed) {
			prepareSendPasswordResetEmail(api, doc, token);
		} else if (doc.token) {
			// the user has clicked the link and entered their new password.

			if (doc.token != token) {
				console.log("Incorrect password reset token. Req id = " +
					reqId);
				doc.failed_token = doc.token;
				finishDoc();
				return;
			}
			changePassword(api, user, doc.password_sha, doc.salt,
					function (er) {
				if (er) {
					console.error("Error changing password in user doc",
						doc);
					return;
				}
				// mark the request as done
				console.log("Success changing password for " + user);
				doc.done = true;
				finishDoc();
			});
		}
	});
}

module.exports = function(api) {
	api.changes("password_reset_requests", function (doc) {
		onPasswordResetRequest(api, doc);
	});
};
