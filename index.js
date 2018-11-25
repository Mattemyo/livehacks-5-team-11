var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);

app.use(express.static('public'));

app.listen(3000, () => console.log('Livehacks #5 team 11 listening on port 3000!'));

app.get('/', (req, res, next) => {
  console.log('get route', req.testing);
  res.end();
});

let userSocket, displaySocket;

const displayHandler = (req) => {
  displaySocket.on('message', (msg) => {
    try {
    } catch (error) {
      console.error(error);
    }
    console.log(msg);
  });
};

const userHandler = (req) => {
  userSocket.on('message', (msg) => {
    try {
      displaySocket.send(msg);
    } catch (error) {
      console.error(error);
    }
    console.log(msg);
  });
};

const middleware = (ws, req) => {
  if (req.query['x-user-listener'] === '1') {
    displaySocket = ws;
    displayHandler(req);
  } else {
    userSocket = ws;
    userHandler(req);
  }
};

app.ws('/:gameId/ws', middleware);
