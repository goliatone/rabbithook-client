'use strict';

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
    var deffered = Q.defer();

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
            deffered.resolve();
        } else {
            deffered.reject('child processs exited with status ' + code);
        }
    });

    return deffered.promise;
};

module.exports = git;
