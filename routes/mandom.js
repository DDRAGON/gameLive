Config = require('../config');

exports.mandom = function(req, res){
	res.render(
		'mandom',
		{
			title: 'Mandom Live!',
			hostAddress: Config.getHostAddress()
		}
	);
};