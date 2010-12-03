function (doc, req) {
	return (doc.type == "tile") &&
		(doc.maze_id == req.query.maze_id);
}