var SMTPConnection = require('smtp-connection');

module.exports = function (options) {
	var state;
	var conn;
	var queue = [];
	var retryMins = 1;

	function connect() {
		state = 'connecting';
		conn = new SMTPConnection(options);
		conn.on('error', onError);
		conn.on('log', onLog);
		conn.connect(onSmtpConnect);
	}

	function onLog(msg) {
		console.log('LOG', msg);
	}

	function onSmtpConnect(er) {
		if (er) {
			console.error('error connecting to smtp server:', er);
			reconnect();
			return;
		}
		if (options.auth) {
			conn.login(options.auth, onAuthed);
		} else {
			onAuthed(null);
		}
	}

	function onAuthed(er) {
		if (er) {
			console.log('smtp auth error:', er);
			reconnect();
		}
		retryMins = 1;
		state = 'connected';
		queue.forEach(function (args) {
			conn.send.apply(conn, args);
		});
		queue.length = 0;
	}

	function onError(er) {
		console.error('smtp error', er);
		if (queue.length) {
			reconnect();
		}
	}

	function reconnect() {
		console.log('reconnecting in', retryMins, 'minutes');
		setTimeout(connect, retryMins * 60000);
		retryMins *= 2;
	}

	connect();

	return {
		send: function (envelope, msg, cb) {
			if (state == 'connected') {
				conn.send(envelope, msg, cb);
			} else {
				queue.push([envelope, msg, cb]);
				if (state != 'connecting') {
					connect();
				}
			}
		}
	};
};
