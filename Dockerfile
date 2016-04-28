FROM hypriot/rpi-iojs:1.6.4
MAINTAINER goliatone <hello@goliatone.com>

# dev deps
# RUN npm install -g nodemon
RUN apt-get update && \
    apt-get install -y git && \
    apt-get clean

RUN mkdir /tmp/rabbithook-builds
RUN mkdir /tmp/rabbithook-builds/logs
RUN mkdir /tmp/rabbithook-builds/tars
RUN mkdir /tmp/rabbithook-builds/sources

COPY . /src

RUN npm install -g npm
RUN npm update

RUN npm cache clean

WORKDIR /src
RUN npm install

EXPOSE  8080
CMD ["node", "bin/daemon", "--config", "/config.yml"]
