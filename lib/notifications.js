'use strict';

var config = require('./config');
var router = require('./router');
var _isArray = require('util').isArray;
var extend = require('gextend');


module.exports = function $notifications(project, branch, logger, options){
    logger.info('[%s] Sending notifications for %s', options.buildId, options.uuid);
    var comments = ['[' + options.project.name + ':' + branch + '] √ BUILD PASSED'];

    if(options.result instanceof Error){
        comments = ['[' + options.project.name + ':' + branch + '] † BUILD FAILED: ' + options.result.message];
    }

    comments.push('You can check the build output at ' +  router.generate('build-link', {
        build: options.uuid,
        projectName: project.name
    }, true));

    if(_isArray(project.notify)){
        project.notify.map(function(handler){
            options.author = options.author;
            options.branch = branch;
            options.comments = comments.concat();

            var notificationOptions = (project.notifications && project.notifications[handler]) || config.get('notifications.' + handler);

            try{
                require('./notifications/' +  handler)(project, extend({logger: logger}, options), notificationOptions);
            } catch(err){
                logger.info('[%s] Error while notifying %s: %s.', options.buildId, handler, err.toString());
            }
        });
    }
};