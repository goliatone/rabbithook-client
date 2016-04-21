'use strict';

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
    var pullRequests = Promise.promisify(options.client.pullRequests);

    return pullRequests.getAll({
        user: options.user,
        repo: options.repo,
        state: 'open'
    });
}

function commentOnPulRequest(options){
    var createComment = Promise.promisify(options.client.issues.createComment);
    return createComment({
        user: options.user,
        repo: options.repo,
        number: options.pr.issue_url.split('/').pop(),
        body: options.comment
    });
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
