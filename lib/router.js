'use strict';
var config = require('./config');
var router = {};

router.generate = function(route, options, absolute){
    return (absolute ? config.get('app.url') : '') + config.get('routes.' + route, options);
};

module.exports = router;
