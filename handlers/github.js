'use strict';


module.exports = function $githubHandler_init(app, options, config){

    return function $githubHandler(payload){
        console.log('Client: github', payload.event);

        // console.log('=================================');
        // console.log('GITHUB');
        // console.log('=================================');
        // console.log(JSON.stringify(payload, null, 4));
        // console.log('=================================');

        ////////////////////////////////////
        ///TODO: We want to move this to
        ///RabbitHook Server and use it for
        ///routing. Jobs should be listeners
        ///to a single topic
        ////////////////////////////////////
        //we should filter out by repo.
        if( options &&
            options.repos &&
            options.repos.length &&
            options.repos.indexOf(payload.repo) === -1)
        {
            return console.log('Repo filtered out', payload.repo);
        }

        //If we merge to master
        if( payload.event === 'pull_request' &&
            payload.data.action === 'closed' &&
            payload.data.pull_request.merged &&
            payload.data.pull_request.base.ref === 'master') {
            console.log('We merged PR to master');
            return app.execute('github', payload.repo, payload);
        }

        //If we want to test something before the PR
        if(payload.event === 'pull_request' &&
            payload.data.action === 'opened' &&
            payload.data.created){
            //We just made a PR against master, we could run
            //tests and comment.
        }

        //we pushed to master:
        if(payload.event === 'push' &&
           payload.data.ref === 'refs/heads/master'){
            console.log('We pushed to master');
            //we should check to see if we want to build on push to master
            return app.execute('github', payload.repo, payload);
        }

        //If we publish a new tag or if we creat a new tag
        if( (payload.event === 'push' && payload.data.ref.indexOf('refs/tags/') === 0) ||
            (payload.event === 'create' && payload.data.ref_type === 'tag')){
            var tag = payload.data.ref.replace('refs/tags/', '');
            console.log('We created a TAG', tag);
            return app.execute('github', payload.repo, payload, tag);
        }

        //if we push to master, and we use the magic words...
        if(payload.event === 'push' && payload.data.ref === 'refs/heads/master'){
            /*
             * if we have txt-command enabled.
             * This actually looks for:
             * - "trigger(s) (a) build"
             * - "trigger(s) (a) build(.*)tag :<tag_name>"
             * push descriptions:
             * This PR will trigger a build after merged to master.
             * This triggers a build and tag it :latest
             * trigger build and tag it :latest
             */
            var textCommand = /triggers?\s+a?\s?build(?:.+tag.+:(\w+))?/i;
            if(textCommand && textCommand.test(payload.data.head_commit.message)){
                var match = textCommand.exec(payload.data.head_commit.message);
                console.log('We used the comment trigger word!');
                console.log(payload.data.head_commit.message);
                console.log(textCommand);
                console.log(match, match && match[1]);
                var tagName = match[1] || config.docker.tagName;
                return app.execute('github', payload.repo, payload, tagName);
            }
        }
    };
};
