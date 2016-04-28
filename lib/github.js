'use strict';

var Api = require('github');
var Promise = require('bluebird');

function createClient(token){
    var client = new Api({version:'3.0.0'});
    client.authenticate({
        type: 'oauth',
        token: token
    });
    return client;
}



function getAllPullRequests(options){
    var pullRequests = Promise.promisifyAll(options.client.pullRequests);

    return pullRequests.getAllAsync({
        user: options.user,
        repo: options.repo,
        state: 'open'
    });
}

function commentOnPulRequest(options){
    var issues = Promise.promisifyAll(options.client.issues);
    return issues.createCommentAsync({
        user: options.user,
        repo: options.repo,
        number: options.pr.issue_url.split('/').pop(),
        body: options.comment
    });
}

var github = {};

/*
 * This will only create a comment on a PR that matches
 * the branch specified in our options.branch property.
 */
github.commentOnPullRequestByBranch = function(options){
    options.client = createClient(options.token);

    getAllPullRequests(options).then(function(pulls){
        pulls.map(function(pr){
            console.log('PR.HEAD.REF', pr.head.ref, options.branch);
            if(pr.head.ref === options.branch){
                options.pr = pr;
                commentOnPulRequest(options).then(function(){
                    options.logger.info('[%s] Commented on PR %s', options.buildId, pr.html_url);
                });
            }
        });
    }).catch(function(err){
        options.logger.error(err);
    });
};

module.exports = github;
