// JALANGI DO NOT INSTRUMENT

module.exports.external_callback = function (x) {
    return x + '!';
};

module.exports.external_callback_reduce = function(acc, val) {
    return acc + ',' + val;
};
