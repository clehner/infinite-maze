function sendNewTileEmail(api, tile, username, email) {
	console.log("Sending new tile email to", username, '<' + email + '>',
		tile.location.join(','), 'by', tile.creator);
	api.sendMail([email], api.render('new_neighbor.txt', {
		user: {
			name: username,
			address: email
		},
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

var notified = {};
var empty = {};
var timeout = 30 * 60 * 1000;
// prevent mail flooding
function notifiedUserRecently(username, location) {
	var notifiedUser = notified[username] || (notified[username] = {});
	var now = Date.now();
	// mark location as notified
	notifiedUser[location[0]+','+location[1]] = now;
	// check if adjacent locations were notified recently
	var lastAdjacentNotification = Math.max(
		notifiedUser[(location[0]-1)+','+(location[1]-1)] || 0,
		notifiedUser[(location[0]-1)+','+location[1]] || 0,
		notifiedUser[(location[0]-1)+','+location[1]+1] || 0,
		notifiedUser[(location[0]+1)+','+(location[1]-1)] || 0,
		notifiedUser[(location[0]+1)+','+location[1]] || 0,
		notifiedUser[(location[0]+1)+','+(location[1]+1)] || 0,
		notifiedUser[location[0]+','+(location[1]+1)] || 0,
		notifiedUser[location[0]+','+(location[1]-1)] || 0);
	if (lastAdjacentNotification && (lastAdjacentNotification + timeout > now)) {
		// notified user about adjacent square within timeout.
		// skip notification about this square.
		return true;
	}
	return false;
}

function notifyUsers(api, doc, usernames) {
	// Notify users of a new drawing
	usernames.forEach(function (username) {
		// Don't notify a user of their own drawing.
		if (username == doc.creator) return;

		// Don't notify user if we already notified them recently about
		// something nearby
		if (notifiedUserRecently(username, doc.location)) {
			console.log('Skipping notification to', username,
				'about tile', doc.location.join(','),
				'which had recent neighbor notification');
			return;
		}

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
	if (doc._deleted) return;
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
