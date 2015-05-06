function sendFlagResolutionEmail(api, flagDoc, tileDoc, email, cb) {
	var user = flagDoc.user;
	console.log("Sending flag resolution email to " + user +
		(api.debug ? " (debug)" : ""));
	api.sendMail([email], api.render('flagged_tile.txt', {
		name: user,
		user_address: email,
		location: tileDoc.location,
		tile_url: api.getTileUrl(tileDoc),
		boundary: api.mimeBoundary()
	}), function (er) {
		if (er) { console.error('Error sending flag resolution email to',
				user + ':', er, flagDoc._id, tileDoc._id);
			return;
		}
		console.log('Sent flag resolution notification.');
		cb();
	});
}

function onFlagResolution(api, flagDoc) {
	if (!flagDoc) return;
	var tileDoc;
	api.db.get(flagDoc.tile_id, function (er, result) {
		tileDoc = result;
		if (er || !tileDoc) {
			console.error("Unable to get tile for flag:", er, flagDoc._id);
			return;
		}
		console.log("got tile doc for flag", result);
		api.getUserEmail(flagDoc.user, gotEmailAddress);
	});

	function gotEmailAddress(er, email) {
		if (er) {
			console.error("Unable to get email to send flag resolution",
			er, flagDoc.user, flagDoc._id);
			return;
		}
		// send out an email and then delete the flag doc
		api.queue(sendFlagResolutionEmail, api, flagDoc, tileDoc, email,
			sentEmail);
	}

	function sentEmail() {
		api.removeDoc(flagDoc, function (er) {
			if (er) {
				console.error("Unable to remove flag");
				return;
			}
			console.log("Resolved flag successfully removed", flagDoc._id);
		});
	}
}

module.exports = function(api) {
	api.changes("flag_resolutions", function (doc) {
		onFlagResolution(api, doc);
	});
};

