'use strict';

var join = require('path').join;
var resolve = require('path').resolve;

var extend = require('gextend');
var Keypath = require('gkeypath');
var Solver = require('gsolver');
var Flattener = require('gsolver/node_modules/flattener');

var solver = new Solver();
var userConfig = require('./userconfig');



var data = {
    amqpClient: {
        type: 'amqp',
        json: true,
        exchange: process.env.NODE_AMQP_EXCHANGE || ('wework.' + process.env.NODE_ENV),
        client: {
            url: process.env.NODE_AMQP_ENDPOINT
        }
    },
    github: {
        repos: []
    },
    docker: {
        tagName: 'latest',
        client: {
            socketPath: '/tmp/docker.sock'
        }
    },
    app: {
        jobsPath: resolve(join(__dirname, '../jobs')),
        url: 'http://localhost:3030',
        storage: 'file'
    },
    builds: {
        concurrent: 1,
        'retry-after': 30
    },
    paths: {
        builds: '${app.url}/tmp/rabbithook-builds',
        sources: '${paths.builds}/sources',
        tars: '${paths.builds}/tars',
        logs: '${paths.builds}/logs'
    }
};

data = extend({}, data, userConfig);

data = solver.solve(data);

var config = Keypath.wrap(data);

/*
 * We need to use require after solving
 * else it flattener breaks :P
 */
config.amqp = require('amqp');

module.exports = config;
