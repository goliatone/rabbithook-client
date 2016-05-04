## RabbitHook Client 
This is a sample client application for RabbitHook, webhooks over RabbitMQ.

Currently this is being used to trigger local docker builds on a RPi after pull request merged to master.

### Configuration
You need to provide a `config.yml` file with configuration options for authentication against services dockerhub or github.

```yaml 
auth:
  dockerhub: # these credentials are only useful if you need to push to the dockerhub
    username: goliatone
    email:    <your_email>
    password: <your_password>
  github: <github_token> #https://github.com/settings/tokens/new
```

### Running 
To run in docker
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


## Logging 
Use remote logging:
https://github.com/miguelmota/winston-remote

[envset]: https://github.com/goliatone/envset


docker build --rm -t goliatone/rabbithook-client .

docker run -ti -p 8080:8080 \
-v /tmp/logs:/tmp/rabbithook-builds/logs \
-v $(pwd)/db:/db \
-v /var/run/docker.sock:/tmp/docker.sock \
goliatone/rabbithook-client


dev 

docker build -f Dockerfile-dev --rm -t goliatone/rabbithook-client .

docker run -ti -v $(pwd):/src -v /var/run/docker.sock:/tmp/docker.sock goliatone/rabbithook-client

//
docker run -ti -v $(pwd)/example/config.yml:/config.yml -v $(pwd):/src -v $(pwd)/db:/db -v /var/run/docker.sock:/tmp/docker.sock --entrypoint /bin/bash goliatone/rabbithook-client



real    26m14.201s
user    0m52.410s
sys 0m40.800s
