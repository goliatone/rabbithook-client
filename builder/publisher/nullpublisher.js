'use strict';

module.exports = function $s3uploads(dockerClient, buildId, project, logger, options){
    return new Promise(function(resolve, reject){
        logger.info('[%s] We did nothing, this is NullPublisher :)');
        resolve();
    });
};
