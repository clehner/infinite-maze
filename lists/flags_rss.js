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

	var mazeBase = 'http://www.theinfinitemaze.com/';

	provides("xml", function() {
		send('<?xml version="1.0" encoding="utf-8"?>\n' +
			'<feed xmlns="http://www.w3.org/2005/Atom">\n' +
			'<title>The Infinite Maze - Flagged Tiles</title>\n' +

			'<subtitle>Tiles flagged by users for deletion</subtitle>\n' +
			'<link rel="alternate" type="text/html" href="' + mazeBase + 'flags.html"/>\n' +
			'<link rel="self" type="application/rss+xml" href="' + mazeBase + 'flags.xml"/>\n' +
			'<updated>2015-04-27T04:03:21+00:00</updated>\n' +
			'<id>urn:uuid:CAD16D94-550B-4EFB-87F2-A6679099AE3A</id>\n');

		var row;
		while (row = getRow()) {
			var value = row.value;
			var users = value.users;
			if (users.length === 0) continue;
			var tile_id = row.key;
			var location = value.location;
			var creator = value.creator;
			var date = new Date(value.newest);
			var src = mazeBase + 'db/' + tile_id + '/tile.png';
			var url = mazeBase + 'flags.html#' + tile_id;
			send(<entry>
				<id>urn:uuid:{tile_id}</id>
				<title>({location.join(',')})</title>
				<updated>{date.toISOString()}</updated>
				<link href={url}/>
				<author>
					<name>{creator}</name>
				</author>
				<content type="xhtml">
					<div xmlns="http://www.w3.org/1999/xhtml">
						<img src={src}/><br/>
						Flagged by {users.join(', ')}
					</div>
				</content>
			</entry>);
		}
		
		return '</feed>';
	});
}
