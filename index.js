const express = require('express');
const app = express();

app.use(express.static('public'));

app.listen(3000, () => console.log('Livehacks #5 team 11 listening on port 3000!'));
