'use strict';

var config = require('../config');

var git = require('./git');
var tar = require('./tar');
var utils = require('./utils');
var docker = require('./docker');
var logger = require('./logger');
var storage = require('./storage');

var hooks = require('./hooks');
var publisher = require('./publisher');
var notifications = require('./notifications');

var fs = require('fs');
var p = require('path');
var url = require('url');
var yaml = require('');
var moment = require('moment');


function getBuildLogger(uuid){
    var logFile = p.join(utils.path('logs'), uuid + '.log');
    var buildLogger = new logger.Logger();
    buildLogger.add(logger.transports.File, {filename: logFile, json: false});
    buildLogger.add(logger.transports.Console, {timestamp: true});

    return buildLogger;
}

var builder = {};

builder.schedule = function $schedule(repo, branch, uuid, dockerOptions){
    var path = p.join(utils.path('sources'), uuid);
    var builds = [];
    var cloneUrl = repo;

    dockerOptions = dockerOptions || {};

    if(branch === 'master') branch = 'latest';

    var token = config.get('auth.github');

    if(token){
        var uri = url.parse(repo);
        uri.auth = token;
        cloneUrl = uri.format(uri);
    }

    console.log('cloning: cloneUrl', cloneUrl, 'path', path, 'branch', branch);
    git.clone(cloneUrl, path, branch).then(function(){
        //we have cloned the repo, and we try to load the build.yml file that should
        //be checked in with the source code.
        return yaml.safeLoad(fs.readFileSync(p.join(path, 'build.yml'), 'utf-8'));
    }).then(function(projects){

    });
};

builder.build = function $build(project, uuid, path, gitBranch, branch, dockerOptions){
    var buildLogger = getBuildLogger(uuid);
    var tarPath = p.join(utils.path('tars'), uuid + '.tar');
    var imageId = project.registry + '/' + project.name;
    var buildId = imageId + ':' + branch;
    var author = 'agent@rabbithook-client.com';
    var now = moment();

    //Persist current build on storage and check to see if we are over capacity.
    storage.saveBuild(uuid, buildId, project.id, branch, 'queued').then(function(){
        return builder.hasCapacity();
    }).then(function(){
        //We are actually going to build it now
        return storage.saveBuild(uuid, buildId, project.id, branch, 'started');
    }).then(function(){
        //Let's get git info for current build
        return git.getLastCommit(path, gitBranch);
    }).then(function(commit){
        //generate rev file
        author = commit.author().email();
        return builder.addRevFile(gitBranch, path, commit, project, buildLogger, {buildId: buildId});
    }).then(function(){
        //build tar, used to build image
        var dockerfilePath = path;

        if(project.dockerfilePath){
            dockerfilePath = p.join(path, project.dockerfilePath);
        }
        return tar.create(tarPath, dockerfilePath + '/');
    }).then(function(){
        buildLogger.info('[%s] Created tarball for %s', buildId, uuid);

        return docker.buildImage(project, tarPath, imageId + ':' + branch, buildId, buildLogger, dockerOptions, uuid);
    }).then(function(){
        buildLogger.info('[%s] %s built successfully', buildId, uuid);
        buildLogger.info('[%s] Tagging %s', buildId, uuid);

        return docker.tag(imageId, buildId, branch, buildLogger);
    }).then(function(image){
        return publisher.publish(docker.client, buildId, project, buildLogger).then(function(){
            return image;
        });
    }).then(function(image){
        buildLogger.info('[%s] Running after-build hooks for %s', buildId, uuid);

        return hooks.run('after-build', buildId, project, docker.client, buildLogger).then(function(){
            return image;
        });
    }).then(function(image){
        buildLogger.info('[%s] Ran after-build hooks for %s', buildId, uuid);
        buildLogger.info('[%s] Pushing %s to %s', buildId, uuid, project.registry);

        return docker.push(image, buildId, uuid, branch, project.registry, buildLogger);
    }).then(function(){
        return storage.saveBuild(uuid, buildId, project.id, branch, 'passed');
    }).then(function(){
        buildLogger.info('[%s] Finished build %s in %s #SWAG', buildId, uuid, moment(now).fromNow(Boolean));
        return true;
    }).catch(function(err){
        if(err.name === 'NO_CAPACITY_LEFT'){
            buildLogger.info('[%s] Too many concurrent builds, queuing this one...', buildId);

            setTimeout(function(){
                builder.build(project, uuid, path, gitBranch, branch, dockerOptions);
            }, config.get('builds.retry-after') * 1000);
        } else {
            return builder.markBuildAsFailed(err, uuid, buildId, project, branch, buildLogger);
        }
    }).then(function(result){
        if(result){
            var payload = {
                author: author,
                project: project,
                result: result,
                uuid: uuid,
                buildId: buildId
            };

            notifications.trigger(project, branch, buildLogger, payload);
        }
    }).catch(function(err){
        buildLogger.error('[%s] Error sending notifications for %s (%s)', buildId, uuid, err.message || err.error, err.stack);
    }).done();
};


builder.hasCapacity = function(){
    return storage.getStartedBuilds().then(function(builds){
        var maxConcurrentBuilds = config.get('builds.concurrent');
        if(maxConcurrentBuilds && builds.length >= maxConcurrentBuilds){
            utils.throw('NO_CAPACITY_LEFT');
        }
    });
};

builder.addRevFile = function(gitBranch, path, commit, project, buildLogger, options){
    var parts = [path];

    if(project.dockerfilePath){
        parts.push(project.dockerfilePath);
    }

    if(project.revfile){
        parts.push(project.revfile);
    }

    var revFilePath = p.join(parts.join('/'), 'rev.txt');

    buildLogger.info('[%s] Going to create revfile in %s', options.buildId, revFilePath);
    fs.appendFileSync(revFilePath, 'Version: ' + gitBranch);
    fs.appendFileSync(revFilePath, '\nDate: ' + commit.date());
    fs.appendFileSync(revFilePath, '\nAuthor: ' + commit.author());
    fs.appendFileSync(revFilePath, '\nSha: ' + commit.sha());
    fs.appendFileSync(revFilePath, '\n');
    fs.appendFileSync(revFilePath, '\nCommit message:');
    fs.appendFileSync(revFilePath, '\n');
    fs.appendFileSync(revFilePath, '\n  ' + commit.message());
    buildLogger.info('[%s] Created revfile in %s', options.buildId, revFilePath);
};

builder.markBuildAsFailed = function(err, uuid, buildId, project, branch, buildLogger){
    var message = err.message || err.error || err;

    return storage.saveBuild(uuid, buildId, project.id, branch, 'failed').then(function(){
        buildLogger.error('[%s] BUILD %s FAILED! ("%s") #YOLO', buildId, uuid, message, err.stack);
        return new Error(message);
    });
};


/*
 * On boot, we want to check unfinished builds
 * before the last shutdown, and mark them as failed.
 */
logger.info('Looking for pending builds...');
storage.getPendingBuilds().then(function(builds){
    builds.map(function(staleBuild){
        logger.info('Build %s marked as failed, was pending upon restart of the server', staleBuild.id);
        storage.saveBuild(staleBuild.id, staleBuild.tag, staleBuild.project, staleBuild.branch, 'failed');
    });
});

module.exports = builder;
