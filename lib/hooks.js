'use strict';

var Promise = require('bluebird');
var _isArray = require('util').isArray;


var hooks = {};

function promisifyHook(dockerClient, buildId, command){
    var deferred = Promise.pending();

    dockerClient.run(buildId, command.split(' '), process.stdout, function(err, data, container){
        if(err){
            deferred.reject(err);
        } else if( data.StatusCode === 0){
            deferred.resolve();
        } else {
            deferred.reject(command + ' failed, exited with status code ' + data.StatusCode);
        }
    });

    return deferred.promise;
}


hooks.run = function(event, buildId, project, dockerClient, logger){
    var deferred = Promise.pending();

    var hooks = project[event];
    var promises = [];

    if(_isArray(hooks)){
        logger.info('[%s] Running %s hooks', buildId, event);

        hooks.map(function(command){
            logger.info('[%s] Running %s hook "%s"', buildId, event, command);
            promises.push(promisifyHook(dockerClient, buildId, command));
        });
        //This will bail out as soon as one promise fails. Review
        return Promise.all(promises);
    } else {
        logger.info('[%s] No %s hooks to run', buildId, event);
        deferred.resolve();
    }

    return deferred.promise;
};

module.exports = hooks;
