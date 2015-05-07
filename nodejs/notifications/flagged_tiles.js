function sendFlagResolutionEmail(api, flagDoc, email, cb) {
	var user = flagDoc.user;
	var location = flagDoc.tile_location;
	console.log("Sending flag resolution email to " + user +
		(api.debug ? " (debug)" : ""));
	api.sendMail([email], api.render('flagged_tile.txt', {
		user: {
			name: user,
			address: email
		},
		location: location,
		tile_url: api.getTileUrl(location),
		boundary: api.mimeBoundary()
	}), function (er) {
		if (er) {
			console.error('Error sending flag resolution email to',
				user + ':', er, flagDoc._id, flagDoc.tile_id);
			return;
		}
		console.log('Sent flag resolution notification.');
		cb();
	});
}

function onFlagResolution(api, flagDoc) {
	if (!flagDoc) return;
	api.getUserEmail(flagDoc.user, function (er, email) {
		if (er) {
			console.error("Unable to get email to send flag resolution",
			er, flagDoc.user, flagDoc._id);
			return;
		}
		// send out an email and then delete the flag doc
		api.queue(sendFlagResolutionEmail, api, flagDoc, email, sentEmail);
	});

	function sentEmail() {
		api.removeDoc(flagDoc, function (er) {
			if (er) {
				console.error("Unable to remove flag:", er);
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

