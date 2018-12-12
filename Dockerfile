FROM node:10.14.2-alpine
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]
