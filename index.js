const express = require('express');
const app = express();

app.use(express.static('public'));

app.listen(3000, () => console.log('Livehacks #4 team 7 listening on port 3000!'));
