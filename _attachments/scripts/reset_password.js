function $(id) {
	return document.getElementById(id);
}

var ResetPassword = (function () {
	Couch.urlPrefix = ".";
	var db = Couch.db("db");
	if (!location.pathname.contains("/_attachments/")) {
		Couch.urlPrefix = "";
	}
	var username;
	var userDb;
	Couch.userDb(function (db) { userDb = db; });
	// preload salt
	Couch.newUUID(1);
	
	var qs = parseQuery(location.search.substr(1));
	// the server will check if the token is a valid hash of reqId with a secret
	var reqId = qs.id;
	var token = qs.token;
	
	// get the request doc
	var reqDoc;
	function getRequestDoc(success, error) {
		db.openDoc(reqId, {
			success: function (doc) {
				reqDoc = doc;
				success && success();
			},
			error: error
		});
	}
	getRequestDoc(function () {
		username = reqDoc.user;
		if (reqDoc.done) {
			errorNoStart("This link was already used.");
		}
		if (reqDoc.failed_token == token) {
			errorNoStart("This link is invalid.");
		}
	}, onInit.curry(function (status, error, reason) {
		if (error == "not_found") {
			errorNoStart("This link cannot be used. Either it was already " +	
				"used, or it expired, or it is invalid.");
		} else {
			errorNoStart("This link is not working. (" + error + ", " +
				reason + ")");
		}
	}));
	
	var loader;
	var password;
	function updateResetRequest(pass, cb) {
		password = pass;
		loader.start();
		Couch.newUUID(1, function gotSalt(salt) {
			// a daemon on the server will pick up this update and update
			// the user doc for us, as long as the token is valid.
			reqDoc.salt = salt;
			reqDoc.password_sha = hex_sha1(password + salt);
			reqDoc.token = token;
			db.saveDoc(reqDoc, {
				success: function () {
					cb(true, "Password change in progress.");
					waitForPasswordChangeReceived(reqDoc._id);
				},
				error: function onError(status, error, reason) {
					if (error == "conflict") {
						// Either the form was submitted twice, or someone else
						// edited the doc before us. Just refetch the doc.
						getRequestDoc(gotSalt.curry(salt), function err() {
							onError(0, "z", "Unable to open the request doc.");
						});
						return;
					}
					cb(false, "Password change failed. " + reason + " :(");
					loader.stop();
				}
			});
		});
	}
	
	function waitForPasswordChangeReceived(reqId) {
		var changes = db.changes(null, {
			filter: "maze/password_reset_requests",
			id: reqId,
			include_docs: true
		});
		function onDocChange(doc) {
			//console.log('doc changed', doc);
			if (doc.failed_token == token) {
				loader.stop();
				errorNoStart("Password change failed. This link is invalid.");
			} else if (doc.done) {
				Couch.login({
					name: username,
					password: password,
					success: function () {
						loader.stop();
						changes.stop();
						db.removeDoc(doc, {error: Function.empty});
						output(true, "Password changed successfully!<br>" +
							"<a href=\"./\">Go to the maze</a>", true);
					},
					fail: function () {
						loader.stop();
						output(false, "Password change failed. :( You can try" +
						" it again though.<br><a href=\"./\">Back to " +
						"the maze</a>");
					}
				});
			}
		}
		changes.onChange(function (resp) {
			resp.results.forEach(function (change) {
				onDocChange(change.doc);
			});
		});
	}
	
	var resultElement;
	function output(success, msg, removeForm) {
		toggleClass(resultElement, "good", success);
		toggleClass(resultElement, "error", !success);
		resultElement.innerHTML = msg;
		if (removeForm) {
			form.style.display = "none";
		}
	}
	
	var form;
	function errorNoStart(msg) {
		output(false, msg, true);
	}
	
	function onFormSubmit(e) {
		e.preventDefault();
		var pass = $("password").value;
		var confirmPass = $("password2").value;
		if (pass != confirmPass) {
			output(0, "You must enter the same password twice to confirm it.");
			return;
		}
		if (!pass) {
			if (!confirm("Are you sure you want a blank password?")) {
				return;
			}
		}
		onInit(updateResetRequest.curry(pass, output));
	}
	
	var initListeners = [], inited;
	function onInit(cb) {
		var listener = cb.apply.bind(cb, this, [].slice.call(arguments, 1));
		if (inited) listener();
		else initListeners.push(listener);
	}

	return {
		init: function init() {
			resultElement = $("reset-password-result");
			form = $("reset-password-form");
			form.onsubmit = onFormSubmit;
			loader = new Loader($("reset-password-result"));
			inited = true;
			initListeners.forEach(init.call.curry());
		}
	};
})();