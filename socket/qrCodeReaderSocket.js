var mandom = require('../modules/mandom.js');

var createQrCodeReaderSocket = function(io) {
	var qrCodeReaderSocket = io.of('/qrCodeReader').on('connection', function (socket) {

		socket.on('imageSendWithPassWord', function(data) {
			mandom.gotImage(data.passWord, data.image);
		});

	});

	return qrCodeReaderSocket;
};

module.exports = createQrCodeReaderSocket;
