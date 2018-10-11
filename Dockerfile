FROM node:10.12.0-alpine
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]
