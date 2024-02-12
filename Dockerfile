FROM node:11

MAINTAINER John Brugge <johnbrugge@benetech.org>

EXPOSE 1337

ENV NODE_ENV production
ENV REDIS_HOST redis
ENV REDIS_PORT 6379


ENV APP_DIR /usr/src/mmlc-api
ENV BUILD_PACKAGES ca-certificates curl unzip
ENV RUNTIME_PACKAGES openjdk-8-jre-headless python netcat-openbsd

RUN mkdir $APP_DIR

WORKDIR $APP_DIR

COPY . $APP_DIR

RUN echo "deb http://archive.debian.org/debian stretch main" > /etc/apt/sources.list && \
    apt-get update && \
    apt-get install -y $BUILD_PACKAGES $RUNTIME_PACKAGES && \
    npm -y install && \
    curl -O -k -L https://archive.apache.org/dist/xmlgraphics/batik/binaries/batik-bin-1.10.zip && \
    unzip batik-bin-1.10.zip && \
    mv batik-1.10 node_modules/mathjax-node/batik/ && \
    rm -rf batik* && \
    chmod -R ugo+rw $APP_DIR && \
    apt-get purge --yes --auto-remove $BUILD_PACKAGES && \
    apt-get clean

CMD node app.js
