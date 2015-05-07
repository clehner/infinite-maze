module.exports = {
	debug: true,
	password_reset_secret: '000000000000000000000000',
	couchdb: 'http://user:pass@localhost:5984/',
	maze_db: 'maze',
	mail: {
		host: 'smtp.gmail.com',
		port: 587,
		secure: true,
		auth: {
			user: '',
			pass: ''
		},
		sender: {
			name: 'The Infinite Maze',
			address: 'news@theinfinitemaze.com'
		},
		site: {
			url: 'http://www.theinfinitemaze.com/',
			name: 'The Infinite Maze'
		}
	}
};
