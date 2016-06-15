var express = require('express');
var passport = require('passport');
var app = express();

require('./js/authentication')(passport);


app.use(passport.initialize());

app.get('/', function(req, res){
    res.sendFile(__dirname + '/view/index.html');
});

app.get('/auth/facebook', passport.authenticate('facebook', { scope : 'email' }));

app.get('/auth/facebook/callback', passport.authenticate('facebook', {
	successRedirect	:	'/dashboard',
	failureRedirect	:	'/'
}));

app.get('/dashboard', function(req, res){
	res.sendFile(__dirname + '/view/dashboard.html');
});

app.get('/logout', function(req, res){
	req.logout();
	res.redirect('/');
});

app.listen(3000);