FROM node:10-alpine@sha256:e771c64a6bd0d64179de2c803c1af491ca4ce2dc418428525f2f7216495b18be
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]