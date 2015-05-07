function(head, req) {
	// https://github.com/tahu/funjes/blob/master/fallback/toISOString.js
	if (typeof Date.prototype.toISOString === 'undefined') {
		Date.prototype.toISOString = (function() {
			function two(n) {
				var s = String(n);
				return s.length < 2 ? '0' + s : s;
			}
			function three(n) {
				var s = two(n);
				return s.length < 3 ? '0' + s : s;
			}
			return function() {
				return isNaN(this) ? "Invalid Date" : this.getUTCFullYear() + '-' + two(this.getUTCMonth() + 1) + '-' + two(this.getUTCDate()) + 'T' + two(this.getUTCHours()) + ':' + two(this.getUTCMinutes()) + ':' + two(this.getUTCSeconds()) + '.' + three(this.getUTCMilliseconds()) + 'Z';
			};
		})();
	}

	var host = req.headers.Host || 'www.theinfinitemaze.com';
	var mazeBase = 'http://' +
		[host].concat(req.requested_path.slice(0, -1), '').join('/');

	provides("xml", function() {
		send('<?xml version="1.0" encoding="utf-8"?>\n' +
			'<feed xmlns="http://www.w3.org/2005/Atom">\n' +
			'<title>The Infinite Maze - Flagged Tiles</title>\n' +

			'<subtitle>Tiles flagged by users for deletion</subtitle>\n' +
			'<link rel="alternate" type="text/html" href="' + mazeBase + 'flags.html"/>\n' +
			'<link rel="self" type="application/atom+xml" href="' + mazeBase + 'flags.xml"/>\n' +
			'<updated>2015-04-27T04:03:21+00:00</updated>\n' +
			'<author><name>The Infinite Maze</name></author>\n' +
			'<id>urn:uuid:CAD16D94-550B-4EFB-87F2-A6679099AE3A</id>\n');

		var row;
		while (row = getRow()) {
			var value = row.value;
			var users = value.users;
			if (users.length === 0) continue;
			var tile_id = row.key[0];
			var location = row.key.slice(1);
			var date = new Date(value.newest);
			var src = mazeBase + 'db/' + tile_id + '/tile.png';
			var url = mazeBase + 'flags.html#' + tile_id;
			var maze_url = mazeBase + '#' + location;
			var entry = <entry>
				<id>{url}</id>
				<title>[{users.length}] ({location})</title>
				<updated>{date.toISOString()}</updated>
				<link href={url}/>
				<content type="html">
					&lt;a href="{maze_url}"&gt;
					&lt;img style="background:black" src="{src}" alt="({location})"&gt;
					&lt;/a&gt;
					&lt;br/&gt;
					Flagged by {users.join(', ')}
				</content>
			</entry>
			users.forEach(function (user) {
				entry.appendChild(<author><name>{user}</name></author>);
			});
			send(entry);
		}
		
		return '</feed>';
	});
}
