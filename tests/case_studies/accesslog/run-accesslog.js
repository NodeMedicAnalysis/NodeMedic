var PUT = require('accesslog');
var x = {0: ""};
__jalangi_set_taint__(x);
try {
	PUT(x);
}catch (e) {
	console.log(e);
}
