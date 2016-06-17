'use strict';
var config = require('./../config');
var router = {};

router.generate = function(route, options, absolute){
    var parsed = (absolute ? config.get('app.url') : '') + config.get('routes.' + route, '');
    return parsed;
    // parsed = config.solver.solve({route: parsed}, options);
    // return parsed.route;
};

module.exports = router;
