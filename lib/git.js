'use strict';

var Promise = require('bluebird');
var spawn = require('child_process').spawn;
var utils = require('./utils');
var Git = require('nodegit');

var git = {};

git.getLastCommit = function(repository, branch){
    return Git.Repository.open(repository).then(function(repo){
        return repo.getBranchCommit(branch);
    });
};

git.clone = function(repo, path, branch, logger){
    logger.info('Clonning %s:%s in %s', utils.obfuscateString(repo), branch, path);
    var deferred = Promise.pending();

    var clone = spawn('git', ['clone', '-b', branch, '--single-branch', '--depth', '1', repo, path]);

    clone.stdout.on('data', function(data){
        logger.info('git clone %s: %s', utils.obfuscateString(repo), data.toString());
    });

    //the output of git clone is sent to stderr rather than stdout
    clone.stderr.on('data', function(err){
        logger.info('git clone %s: %s', utils.obfuscateString(repo), err.toString());
    });

    clone.on('close', function(code){
        if(code === 0){
            logger.info('git clone %s: finished cloning', utils.obfuscateString(repo));
            deferred.resolve();
        } else {
            deferred.reject('child process exited with status ' + code);
        }
    });

    return deferred.promise;
};

module.exports = git;
