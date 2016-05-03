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
var yaml = require('js-yaml');
var moment = require('moment');


function getBuildLogger(uuid){
    var logFile = p.join(utils.path('logs'), uuid + '.log');
    var buildLogger = new logger.Logger();
    buildLogger.add(logger.transports.File, {filename: logFile, json: false});
    buildLogger.add(logger.transports.Console, {timestamp: true});

    return buildLogger;
}

var builder = {};

builder.schedule = function $schedule(repo, gitBranch, uuid, dockerOptions){
    var path = p.join(utils.path('sources'), uuid);
    var builds = [];
    var branch = gitBranch;
    var cloneUrl = repo;

    dockerOptions = dockerOptions || {};

    if(branch === 'master') branch = 'latest';

    var token = config.get('auth.github');

    if(token){
        var uri = url.parse(repo);
        uri.auth = token;
        cloneUrl = uri.format(uri);
    }

    console.log('cloning: cloneUrl', cloneUrl, 'path', path, 'branch', gitBranch);
    git.clone(cloneUrl, path, gitBranch, logger).then(function $afterGitCloned(){
        //we have cloned the repo, and we try to load the build.yml file that should
        //be checked in with the source code.
        var buildfile = config.get('builds.filename', 'build.yml');
        var buildManifest = p.join(path, buildfile);
        try {
            return yaml.safeLoad(fs.readFileSync(buildManifest, 'utf-8'));
        } catch(err){
            logger.error('Seems like our target repo does not have a proper buildfile %s file', buildManifest);
        }

        /*
         * We did not find a build.yml file. Let's make
         * the smallest configuration for the current
         * build:
         * use the repo name and build as a project,
         * i.e. github.com/goliatone/menagerie will
         * build under the name "menagerie"
         */
        var buildConfig = {};
        buildConfig[cloneUrl.split('/').pop()] = config.get('builds.defaultBuildObject', {});

        return buildConfig;

    }).then(function $pushBuild(projects){
        console.log('--------------------------');
        console.log('Projects', JSON.stringify(projects, null, 4));
        var project;
        Object.keys(projects).map(function(name){

            project = projects[name];
            project.id = repo + '__' + name;
            project.name = name;
            project.repo = repo;
            project.homepage = repo;
            project['github-token'] = token;
            project.registry = project.registry || '127.0.0.1:5000';

            console.log('project %s : %s', name, utils.jsonfuscate(project));

            if(!!project.uuid){
                dockerOptions.dockerfile = project.build.dockerfile;
            }

            builds.push(builder.build(project, uuid + '-' + project.name, path, gitBranch, branch, dockerOptions));
        });

        console.log(JSON.stringify(builds, null, 4));
        console.log('--------------------------');
        return builds;
    }).catch(function(err){
        logger.error('Error scheduling build');
        logger.error(err.toString(), err.stack);
    });
};

builder.build = function $build(project, uuid, path, gitBranch, branch, dockerOptions){
    var buildLogger = getBuildLogger(uuid);
    var tarPath = p.join(utils.path('tars'), uuid + '.tar');
    // var imageId = 'goliatone' + '/' + project.name;
    var imageId = project.registryUser + '/' + project.name;
    var buildId = imageId + ':' + branch;
    var author = 'agent@rabbithook-client.com';
    var now = moment();

    buildLogger.info('[%s] Builder build %s, path %s, gitBranch %s, branch %s', buildId, uuid, path, gitBranch, branch);

    //Persist current build on storage and check to see if we are over capacity.
    storage.saveBuild(uuid, buildId, project.id, branch, 'queued').then(function $checkCapacity(){

        return builder.hasCapacity();

    }).then(function $saveBuild(){
        //We are actually going to build it now
        return storage.saveBuild(uuid, buildId, project.id, branch, 'started');

    }).then(function $getGitLastCommit(){
        //Let's get git info for current build
        return git.getLastCommit(path, gitBranch);

    }).then(function $addRevFile(commit){
        //generate rev file
        author = commit.author().email();
        return builder.addRevFile(gitBranch, path, commit, project, buildLogger, {buildId: buildId});

    }).then(function $createTar(){
        //build tar, used to build image
        var dockerfilePath = path;

        if(project.dockerfilePath){
            dockerfilePath = p.join(path, project.dockerfilePath);
        }

        return tar.create(tarPath, dockerfilePath + '/');
    }).then(function $dockerTag(){
        buildLogger.info('[%s] Created tarball for %s', buildId, uuid);
        buildLogger.info('[%s] Building docker image for %s', buildId, uuid);

        return docker.buildImage(project, tarPath, imageId + ':' + branch, buildId, buildLogger, dockerOptions, uuid);
    }).then(function(){
        buildLogger.info('[%s] %s built successfully', buildId, uuid);
        buildLogger.info('[%s] Tagging %s, branch %s', buildId, uuid, branch);

        return docker.tag(imageId, buildId, branch, buildLogger);
    }).then(function $publish(image){
        return publisher.publish(docker.client, buildId, project, buildLogger).then(function(){
            return image;
        });
    }).then(function $runHooks(image){
        buildLogger.info('[%s] Running after-build hooks for %s', buildId, uuid);

        return hooks.run('after-build', buildId, project, docker.client, buildLogger).then(function(){
            return image;
        });
    }).then(function $dockerPush(image){
        buildLogger.info('[%s] Ran after-build hooks for %s', buildId, uuid);
        buildLogger.info('[%s] Pushing branch %s to %s', buildId, branch, project.registry);

        return docker.push(image, buildId, uuid, branch, project.registry, buildLogger);

    }).then(function $saveBuild(){
        buildLogger.info('[%s] Updating build status as "%s"', buildId, 'passed');
        return storage.saveBuild(uuid, buildId, project.id, branch, 'passed');
    }).then(function(){
        buildLogger.info('[%s] Finished build %s in %s #SWAG', buildId, uuid, moment(now).fromNow(Boolean));
        return true;
    }).catch(function $handleBuildError(err){
        if(err.name === 'NO_CAPACITY_LEFT'){
            buildLogger.info('[%s] Too many concurrent builds, queuing this one...', buildId);
            setTimeout(function(){
                builder.build(project, uuid, path, gitBranch, branch, dockerOptions);
            }, config.get('builds.retry-after') * 1000);
        } else {

            return builder.markBuildAsFailed(err, uuid, buildId, project, branch, buildLogger);
        }
    }).then(function $triggerNotification(result){
        if(result){
            var payload = {
                author: author,
                project: project,
                result: result,
                uuid: uuid,
                buildId: buildId,
                branch: branch
            };

            notifications.trigger(project, gitBranch, buildLogger, payload);
        }
    }).catch(function $handleError(err){
        buildLogger.error('[%s] Error sending notifications for %s (%s)', buildId, uuid, err.message || err.error, err.stack);
    }).done();
};


builder.hasCapacity = function(){
    return storage.getStartedBuilds().then(function(builds){
        var maxConcurrentBuilds = config.get('builds.concurrent');
        if(maxConcurrentBuilds && builds.length >= maxConcurrentBuilds){
            logger.error('Error builds %s, max allowed are %s builds', builds, maxConcurrentBuilds);
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
