function sendNewTileEmail(api, tile, username, email) {
	console.log("Sending new tile email to " + username +
		(api.debug ? " (debug)" : "") + ": " + JSON.stringify(tile));
	api.sendMail([email], api.render('new_neighbor.txt', {
		name: username,
		user_address: email,
		creator: tile.creator,
		link: api.getTileUrl(tile.location),
		boundary: api.mimeBoundary()
	}), function (er) {
		if (er) {
			console.error('Error on tile to '+username+': '+er);
			return;
		}
		console.log('Sent tile email!');
	});
}

function notifyUsers(api, doc, usernames) {
	// Notify users of a new drawing
	usernames.forEach(function (username) {
		// Don't notify a user of their own drawing.
		if (username == doc.creator) return;
		// Get the email address for a username
		api.getUserEmail(username, function (er, email, prefs) {
			if (er) {
				console.error("Unable to get email", er, username, doc);
				return;
			}
			if (prefs.receive_tile_notifications) {
				// Send the email
				api.queue(sendNewTileEmail, api, doc, username, email);
			}
		});
	});
}

function onTilesToEmail(api, doc) {
	// Get the changed tile
	// Get the usernames of the creators of the adjacent tiles.
	api.db.view("maze", "adjacent_tile_creators", {
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
		api.saveDoc(doc, function (er) {
			if (er) {
				console.error("Error updating doc " + JSON.stringify(doc));
				return;
			}
			notifyUsers(api, doc, usernames);
		});
	});
}

module.exports = function (api) {
	api.changes("tiles_to_email", function (doc) {
		onTilesToEmail(api, doc);
	});
};
