'use strict';

var aws = require('aws-sdk');


module.exports = function(project, options, notificationOptions){
    aws.config.region = notificationOptions.region;
    aws.config.accessKeyId = notificationOptions.accessKey;
    aws.config.secretAccessKey = notificationOptions.secret;

    var ses = new aws.SES({apiVersion: '2010-12-01'});
    var recipients = [];

    notificationOptions.to.map(function(recipient){

        if(recipient === 'commiter' && options.author){
            recipients.push(options.author);
        } else {
            recipients.push(recipient);
        }
    });

    ses.sendEmail({
        Source: notificationOptions.from,
        Destination: { ToAddresses: recipients },
        Message: {
            Subject: {
                Data: options.comments.shift()
            },
            Body: {
                Text: {
                    Data: options.comments.join('\n')
                }
            }
        }
    }, function(err, data){
        if(err){
            return options.logger.error(err);
        }
        options.logger.info('[%s] Sent email to %s', options.buildId, notificationOptions.to.join(','));
    });
};
