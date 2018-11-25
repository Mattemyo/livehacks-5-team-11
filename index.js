
var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);

app.use(express.static('public'));

app.listen(3000, () => console.log('Livehacks #5 team 11 listening on port 3000!'));

app.use((req, res, next) => {
  console.log('middleware');
  req.testing = 'testing';
  return next();
});

app.get('/', (req, res, next) => {
  console.log('get route', req.testing);
  res.end();
});

app.ws('/:gameId', (ws, req) => {
  ws.on('message', (msg) => {
    console.log(msg);
  });
  console.log('socket', req.testing);
});
