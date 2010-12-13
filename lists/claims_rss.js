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
	
	provides("xml", function() {
		send('<?xml version="1.0" encoding="utf-8"?>\n' +
			'<feed xmlns="http://www.w3.org/2005/Atom">\n' +
			'<title>The Infinite Maze - Tile Claims</title>' +
			'<id>urn:uuid:3E6BDCD0-C684-4B1F-8A99-D04850B9303B</id>' +
			'<link rel="alternate" href="claims.html"/>');
		var row;
		while (row = getRow()) {
			var doc = row.value;
			var src = 'db/' + doc.tile_id + '/tile.png';
			var url = "claims.html#" + doc._id;
			send(<entry>
				<id>urn:uuid:{doc._id}</id>
				<title>{doc._id} ({doc.user})</title>
				<updated>{new Date(doc.created_at).toISOString()}</updated>
				<link href={url}/>
				<author>
					<name>{doc.user}</name>
				</author>
				<content type="xhtml">
					<div xmlns="http://www.w3.org/1999/xhtml">
						<img src={src}/>
					</div>
				</content>
			</entry>);
		}
		
		return "</feed>";
	});
}