'use strict';

module.exports = {
    amqpClient: {
        type: 'amqp',
        json: true,
        amqp: require('amqp'),
        exchange: process.env.NODE_AMQP_EXCHANGE || ('wework.' + process.env.NODE_ENV),
        client: {
            url: process.env.NODE_AMQP_ENDPOINT
        }
    },
    github: {
        repos: []
    },
    docker: {
        tagName: 'latest'
    }
};
