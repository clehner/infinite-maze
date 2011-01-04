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
	
	var defaultMaze = "1";
	provides("xml", function() {
		var mazeTitle = "The Infinite Maze";
		var mazeId = req.query.id || defaultMaze;
		var mazeAddr = '../' + (mazeId == defaultMaze ? '' : '?maze=' + mazeId);
		send('<?xml version="1.0" encoding="utf-8"?>\n' +
			'<feed xmlns="http://www.w3.org/2005/Atom">\n' +
			'<title>' + mazeTitle + ' - New Tiles</title>' +
			'<id>urn:uuid:3E6BDCD0-C684-4B1F-8A99-D04850B9303A</id>' +
			'<link rel="alternate" href="' + mazeAddr + '"/>');
		//var newest_date = new Date(0);
		//send(JSON.stringify(req));
		while (row = getRow()) {
			var value = row.value;
			var date = new Date(value.created_at);
			/*if (date > newest_date) {
				newest_date = date;
			}*/
			var coords = "(" + value.location.join(", ") + ")";
			var creator = value.creator;
			var src = '../../db/' + row.id + '/tile.png';
			var title = "Tile at " + coords + " by " + creator + " on " +
				date.toLocaleString();
			var url = mazeAddr + "#" + value.location.join(",");
			var entry = <entry>
				<id>urn:uuid:{row.id}</id>
				<title>{coords}</title>
				<updated>{date.toISOString()}</updated>
				<link href={url} />
				<content type="xhtml">
					<div xmlns="http://www.w3.org/1999/xhtml">
						<img style="background:black" src={src} alt={title}/>
					</div>
				</content>
			</entry>;
			if (creator) {
				entry.appendChild(<author><name>{creator}</name></author>);
			}
			send(entry);
		}
		
		//send("<updated>" + newest_date.toISOString() + "</updated>");
		
		return "</feed>";
	});
}

	/*<link href="http://localhost:5984/" />
	<id>urn:uuid:3E6BDCD0-C684-4B1F-8A99-D04850B9303A</id>
	<updated>{{LAST_UPDATE}}</updated>
	<author>
		<name>John Doe</name>
		<email>johndoe@example.com</email>
	</author>
 
	<entry>
		<title>Atom-Powered Robots Run Amok</title>
		<link href="http://example.org/2003/12/13/atom03" />
		<link rel="alternate" type="text/html" href="http://example.org/2003/12/13/atom03.html"/>
		<link rel="edit" href="http://example.org/2003/12/13/atom03/edit"/>
		<id>urn:uuid:1225c695-cfb8-4ebb-aaaa-80da344efa6a</id>
		<updated>2003-12-13T18:30:02Z</updated>
		<summary>Some text.</summary>
	</entry>
 
</feed>	*/
