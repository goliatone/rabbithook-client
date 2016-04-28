'use strict';

var Promise = require('bluebird');
var Api = require('github');

function createClient(token){
    var client = new Api({version:'3.0.0'});
    client.authenticate({
        type: 'oauth',
        token: token
    });
    return client;
}



function getAllPullRequests(options){
    var deferred = Promise.pending();

    options.client.pullRequests.getAll({
        user: options.user,
        repo: options.repo,
        state: 'open'
    }, function(err, pulls){
        if(err) return deferred.reject(err);
        deferred.resolve(pulls);
    });

    return deferred.promise;
}

function commentOnPulRequest(options){
    var deferred = Promise.pending();

    options.client.issues.createComment({
        user: options.user,
        repo: options.repo,
        number: options.pr.issue_url.split('/').pop(),
        body: options.comment
    }, function(err, data){
        if(err) return deferred.reject(err);
        deferred.resolve(data);
    });

    return deferred.promise;
}

var github = {};

github.commentOnPullRequestByBranch = function(options){
    options.client = createClient(options.token);

    getAllPullRequests(options).then(function(pulls){
        pulls.map(function(pr){
            if(pr.head.ref === options.branch){
                options.pr = pr;
                commentOnPulRequest(options).then(function(){
                    options.loggger.info('[%s] Commented on PR %s', options.buildId, pr.html_url);
                });
            }
        });
    }).catch(function(err){
        options.logger.error(err);
    });
};

module.exports = github;
