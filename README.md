## RabbitHook Client 
This is a sample client application for RabbitHook, webhooks over RabbitMQ.

Currently this is being used to trigger local docker builds on a RPi after pull request merged to master.


### Environmental variables

* `NODE_AMQP_ENDPOINT`
* `NODE_AMQP_EXCHANGE`



Using [envset][envset]:

```
$ envset production -- ./bin/daemon
```

```ini
[development]
NODE_AMQP_ENDPOINT=amqp://localhost:54321
NODE_AMQP_EXCHANGE= rpis.development

[production]
NODE_AMQP_ENDPOINT=amqp://192.112.34.129:4243/afmnoabp
NODE_AMQP_EXCHANGE= rpis.production
```



[envset]: https://github.com/goliatone/envset
