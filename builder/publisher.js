'use strict';

var extend = require('gextend');
var Promise = require('bluebird');
var config = require('./../config');


var publisher = {};

publisher.publish = function(dockerClient, buildId, project, logger, options){
    if(project.publish){
        logger.info('[%s] Publishing artifacts...', buildId);
        var publishers = [];

        project.publish.map(function(target){
            logger.info('[%s] Publishing to %s', buildId, target.to);
            var publisherConfig = {};
            //We can pull configuration options from main config:
            if(config.target.publisher && config.target.publisher.hasOwnProperty(target.to)){
                publisherConfig = config.target.publisher[target.to];
            }

            extend(target, publisherConfig);
            publishers.push(
                require('./publisher/' + target.to)(dockerClient, buildId, project, logger, target)
            );
        });

        return Promise.all(publishers);
    } else {
        logger.info('[%s] Nothing to publish for this build', buildId);
        return Promise.resolve(true);
    }
};

module.exports = publisher;
