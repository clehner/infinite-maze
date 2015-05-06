var sys = require('sys');

function sendNewTileEmail(api, tile, username, email) {
	sys.puts("Sending new tile email to " + username +
		(api.debug ? " (debug)" : "") + ": " + JSON.stringify(tile));
	api.mail.message({
		from: api.sender,
		to: '"' + username + '" <' + (api.debugAddress || email) + '>',
		subject: 'New maze drawing',
		'Content-Type': 'text/html'
	})
	.body(api.render('new_neighbor.html', {
		name: username,
		creator: tile.creator,
		link: api.getTileUrl(tile),
	}))
	.send(function (er) {
		if (er) {
			sys.debug('Error on tile to '+username+': '+er);
			throw er;
		}
		sys.debug('Sent tile email!');
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
				sys.debug("Error updating doc " + JSON.stringify(doc));
				return;
			}
			usernames.forEach(function (username) {
				// Don't notify a user of their own drawing.
				if (username != doc.creator) {
					// Get the email address for a username
					api.getUserEmail(username, function (er, email, prefs) {
						if (er) throw er;
						if (prefs.receive_tile_notifications) {
							// Send the email
							api.queue(sendNewTileEmail, api,
								doc, username, email);
						}
					});
				}
			});
		});
	});
}

module.exports = function (api) {
	api.changes("tiles_to_email", function (doc) {
		onTilesToEmail(api, doc);
	});
};
