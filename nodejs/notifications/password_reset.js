var sys = require('sys');
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
		cb(hex_hmac_sha1(api.cred.password_reset_secret, data));
	});
}

function changePassword(api, username, password_sha, salt, cb) {
	api.getUserDoc(username, function (er, doc) {
		if (er) return cb(er);
		doc.password_sha = password_sha;
		doc.salt = salt;
		api.saveDoc(doc, cb);
	});
}

function sendPasswordResetEmail(api, username, email, requestId, token) {
	sys.puts("Sending password reset email to " + username +
		(api.debug ? " (debug)" : "") + ". request id = " + requestId);
	api.mail.message({
		from: api.sender,
		to: '"' + username + '" <' + (api.debugAddress || email) + '>',
		subject: 'Password reset request'
	})
	.body(api.render('password_reset.txt', {
		username: username,
		link: api.siteRoot + 'reset_password.html?id=' + requestId +
			'&token=' + token
	}))
	.send(function (er) {
		if (er) {
			sys.debug('Error sending pass reset email to '+username+': '+er);
			throw er;
		}
		sys.debug('Sent password reset request!');
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
				sys.debug("Error finishing password reset doc. id = " +
					reqId + ", er = " + JSON.stringify(er));
			}
		});
	}
	if (doc.expires < Date.now()) {
		sys.debug("Attempt to use an expired password reset." + reqId);
		api.removeDoc(doc, function (er, ok) {
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
	makePasswordResetToken(api, doc, function (token) {
		if (!doc.emailed) {
			// send out email
			doc.emailed = true;
			api.getUserEmail(doc.user, function (er, email) {
				if (er) throw er;
				api.saveDoc(doc, function (er) {
					if (er) {
						sys.debug("Error updating password req doc " +
							JSON.stringify([er, doc]));
						return;
					}
					api.queue(sendPasswordResetEmail, api,
						user, email, reqId, token);
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
			changePassword(api, user, doc.password_sha, doc.salt,
					function (er) {
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
}

module.exports = function(api) {
	api.changes("password_reset_requests", function (doc) {
		onPasswordResetRequest(api, doc);
	});
};
