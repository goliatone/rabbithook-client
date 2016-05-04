FROM hypriot/rpi-iojs:1.6.4
MAINTAINER goliatone <hello@goliatone.com>

# dev deps
# RUN npm install -g nodemon
RUN apt-get update && \
    apt-get install -y git && \
    apt-get clean

RUN mkdir -p /tmp/rabbithook-builds/logs && \
    mkdir -p /tmp/rabbithook-builds/tars && \
    mkdir -p /tmp/rabbithook-builds/sources

RUN npm install -g npm
RUN npm update

RUN npm config set registry http://registry.npmjs.org/ && \
    npm config set strict-ssl false

# RUN npm cache clean

#use changes to package.json to force Docker to not use
#cache. Use docker build --no-cache to force npm install.
ADD package.json /tmp/package.json

RUN cd /tmp && npm install -ddd
RUN cp -a /tmp/node_modules /src/

WORKDIR /src

COPY . /src

EXPOSE  8080

CMD ["node", "bin/daemon", "--config", "/config.yml"]
