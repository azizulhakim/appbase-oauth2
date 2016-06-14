var express = require('express');
var app = express();

app.get('/', function(req, res){
    res.sendFile(__dirname + '/view/index.html');
});

app.get('/auth/*', function(req, res){
	res.send('Not Implemented');
});

app.listen(3000);