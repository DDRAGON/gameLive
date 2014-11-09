var mandom = require('../modules/mandom.js');

var createMandomSocket = function(io) {
	var mandomSocket = io.of('/mandom').on('connection', function (socket) {

		mandom.connect(socket);

		socket.on('imageSend', function(image) {
			mandom.gotImage(socket.id, image);
		});

		socket.on('updatePlayerName', function(data) {
			mandom.updatePlayerName(socket.id, data.seatId, data.name);
		});

		socket.on('disconnect', function() {
			mandom.disconnect(socket.id);
		});
	});

	return mandomSocket;
};

module.exports = createMandomSocket;
