'use strict';

var git = require('./git');
var docker = require('./docker');
var config = require('../config');
var storage = require('./storage');
var utils = require('./utils');
var fs = require('fs');
var p = require('path');
var url = require('url');
var yaml = require('yaml');
var moment = require('moment');

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
    var tarPath = p.join(utils.path('tars'), uuid + '.tar');
    var imageId = project.registry + '/' + project.name;
    var buildId = imageId + ':' + branch;
    var author = 'agent@rabbithook-client.com';
    var now = moment();


};
