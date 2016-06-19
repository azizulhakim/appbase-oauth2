var express = require('express');
var passport = require('passport');
var session = require('express-session');
var credentials = require('./config/credentials')
var Appbase = require('appbase-js');
var Sockbase = require('./js/sockbase');
var Acl = require('./js/acl');
var appbaseStore = require('connect-appbase')(session);
var passportSocketIo = require('passport.socketio');
var cookieParser = require('cookie-parser');
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/passport_db');
var MongoStore = require('connect-mongo')(session);

var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);

var appbaseRef = new Appbase({
	url: credentials.appbaseAuth.url,
	appname: credentials.appbaseAuth.appName,
	username: credentials.appbaseAuth.userName,
	password: credentials.appbaseAuth.password
});

app.use(express.static(__dirname));
require('./js/authentication')(passport);

app.use(session( {
	secret: 'appbaseoauth2', 
	store: new MongoStore({
		mongooseConnection:  mongoose.connection
    })/*new appbaseStore( { client: appbaseRef } )*/
}));
				
app.use(passport.initialize());
app.use(passport.session());

io.use(passportSocketIo.authorize({
	key				:	'connect.sid',
	secret			:	'appbaseoauth2',
	store			:	new MongoStore( { mongooseConnection:  mongoose.connection } ),
	passport		:	passport,
	cookieParser	:	cookieParser
}));

var wildcard = require('socketio-wildcard');
var nsp;
var role = 'none';
var sessionCount = 0;

var acl = new Acl(appbaseRef);

acl.addPermission('admin', 'pendingpost', 'write');
acl.addPermission('admin', 'pendingpost', 'read');
acl.addPermission('admin', 'pendingpost', 'delete');
acl.addPermission('admin', 'approvedpost', 'read');
acl.addPermission('admin', 'approvedpost', 'write');
acl.addPermission('admin', 'approvedpost', 'delete');


acl.addPermission('user', 'pendingpost', 'write');
acl.addPermission('user', 'approvedpost', 'read');


var sockbase = new Sockbase(appbaseRef, acl);

var callbacks = {
	'loggedin': sockbase.onLogin.bind(sockbase),
	'subscribe_publish': sockbase.onSubscribeApproved.bind(sockbase),
	'subscribe_pending': sockbase.onSubscribePending.bind(sockbase),
	'on_blog_post': sockbase.onBlogPost.bind(sockbase),
	'approve_pending': sockbase.onApprovePost.bind(sockbase),
	'move_to_pending': sockbase.onDisapprovePost.bind(sockbase),
	'delete_post': sockbase.onDeletePost.bind(sockbase),
	'disconnect': sockbase.onDisconnect.bind(sockbase)
};

function isLoggedIn(req, res, next){
	if (req.isAuthenticated()){
		return next();
	}
	
	res.redirect('/');
};

io.on('connection', function(socket) {
	console.log('a user connected');

	var middleware = wildcard();
	nsp = io.of('/sockbase');
	io.use(middleware);
	nsp.use(middleware);

	var sessionId = 'room' + sessionCount;
	socket.join(sessionId);
	io.to(sessionId).emit('joined', sessionId);
	sessionCount++;

	socket.on('*', function(msg) {
		isLoggedIn(socket.request, null, function(){
			callbacks[msg.data[0]](io, socket, msg.data[1]);
		});
	});
});

app.get('/', function(req, res){
    res.sendFile(__dirname + '/view/index.html');
});

app.get('/auth/facebook', passport.authenticate('facebook', { scope : 'email' }));

app.get('/auth/facebook/callback', passport.authenticate('facebook', {
	successRedirect	:	'/dashboard',
	failureRedirect	:	'/'
}));

app.get('/auth/twitter', passport.authenticate('twitter'));

app.get('/auth/twitter/callback', passport.authenticate('twitter', {
	successRedirect	:	'/dashboard',
	failureRedirect	:	'/'
}));

app.get('/dashboard', isLoggedIn, function(req, res){
	res.sendFile(__dirname + '/view/dashboard.html');
});

app.get('/logout', function(req, res){
	
	req.session.destroy(function(){
		res.redirect('/');
	});
});

http.listen(3000, function() {
	console.log('listening on *:3000');
});