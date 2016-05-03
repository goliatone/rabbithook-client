'use strict';

var ascoltatori = require('ascoltatori');


module.exports.init = function(app, config){
    ascoltatori.build(config, function (ascoltatore) {
        console.log('===> AMQP "client": CONNECTED', JSON.stringify(config, null, 4));

        ascoltatore.subscribe('rabbithook/github', function(topic, message) {
            console.log('Github: amqp event', topic/*, message*/);
            app.emit('github', message);
        });

        ascoltatore.subscribe('rabbithook/dockerhub', function(topic, message){
            console.log('Dockerhub: amqp event', topic/*, message*/);
            app.emit('dockerhub', message);
        });

        ascoltatore.subscribe('rabbithook/initialize', function(topic, message){
            console.log('Connection with server OK √');
        });
    });
};
