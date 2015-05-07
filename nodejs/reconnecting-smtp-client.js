var SMTPConnection = require('smtp-connection');

module.exports = function (options) {
	var state = 'disconnected';
	var conn;
	var queue = [];
	var retryMins = 1;
	var noopTimeout;

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

	function beIdle() {
		if (queue.length === 0) {
			state = 'idle';
			startNoopTimeout();
		} else {
			state = 'sending';
			var args = queue.unshift();
			conn.send(args.envelope, args.msg, function (err, info) {
				args.cb(err, info);
				beIdle();
			});
		}
	}

	function onAuthed(er) {
		if (er) {
			console.log('smtp auth error:', er);
			reconnect();
		}
		retryMins = 1;
		beIdle();
	}

	function startNoopTimeout() {
		noopTimeout = setTimeout(noop, 1000 * 60 * 2);
	}

	function noop() {
		state = 'noop';
		conn._sendCommand('NOOP');
		conn._currentAction = function(str) {
			if (str.substr(0, 3) !== '250') {
				console.error('Unexpected response to NOOP:', str);
			}
			beIdle();
		};
	}

	function onError(er) {
		console.error('smtp error', er);
		state = 'disconnected';
		clearTimeout(noopTimeout);
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
			if (state == 'idle') {
				conn.send(envelope, msg, cb);
			} else {
				queue.push({
					envelope: envelope,
					msg: msg,
					cb: cb
				});
				if (state == 'disconnected') {
					connect();
				}
			}
		}
	};
};
