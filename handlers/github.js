'use strict';


module.exports = function $githubHandler_init(app, options, config){

    return function $githubHandler(payload){
        console.log('Client: github', payload.event);
        // console.log('Client: github', JSON.stringify(payload, null, 4));

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
            app.execute('github', payload.repo, payload);
        }

        //If we publish a new tag or if we creat a new tag
        if( (payload.event === 'push' && payload.data.ref.indexOf('refs/tags/') === 0) ||
            (payload.event === 'create' && payload.data.ref_type === 'tag')){
            var tag = payload.data.ref.replace('refs/tags/', '');
            console.log('We created a TAG', tag);
            app.execute('github', payload.repo, payload);
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
                app.execute('github', payload.repo, payload, tagName);
            }
        }
    };
};
