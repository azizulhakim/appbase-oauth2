var express = require('express');
var passport = require('passport');
var session = require('express-session');
var credentials = require('./config/credentials')
var Appbase = require('appbase-js');
var Sockbase = require('./js/sockbase');
var Acl = require('./js/acl');
var passportSocketIo = require('passport.socketio');
var cookieParser = require('cookie-parser');
var mongoose = require('mongoose');
var bodyParser = require("body-parser");

var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);

var appbaseRef = new Appbase({
	url: credentials.appbaseAuth.url,
	appname: credentials.appbaseAuth.appName,
	username: credentials.appbaseAuth.userName,
	password: credentials.appbaseAuth.password
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); 
app.set('view engine', 'ejs');
app.use(express.static(__dirname));
require('./js/authentication')(passport);


var sessionStore = null;
if (process.argv[2] === 'appbase'){
	console.log('using appbase.io as session store');
	var appbaseStore = require('connect-appbase')(session);
	sessionStore = new appbaseStore( { client: appbaseRef } );
}
else{
	console.log('using mongodb as session store');
	mongoose.connect(credentials.mongodb.url);
	var MongoStore = require('connect-mongo')(session);	
	sessionStore = new MongoStore({	mongooseConnection:  mongoose.connection });
}



//var sessionStore = new MongoStore({	mongooseConnection:  mongoose.connection });
//var sessionStore = new appbaseStore( { client: appbaseRef } );

app.use(session( {
	secret: 'appbaseoauth2', 
	store: sessionStore
}));
				
app.use(passport.initialize());
app.use(passport.session());

io.use(passportSocketIo.authorize({
	key				:	'connect.sid',
	secret			:	'appbaseoauth2',
	store			:	sessionStore,
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
	'update_role': sockbase.onUpdateRole.bind(sockbase),
	'disconnect': sockbase.onDisconnect.bind(sockbase)
};

var clientSockets = {};

function isLoggedIn(req, res, next){	
	if (req.isAuthenticated()){
		return next();
	}
	
	res.redirect('/');
};

io.on('connection', function(socket) {
	console.log('a user connected');
	
	clientSockets[socket.request.sessionID] = socket;

	var middleware = wildcard();
	nsp = io.of('/sockbase');
	io.use(middleware);
	nsp.use(middleware);

	var sessionId = 'room' + sessionCount;
	socket.join(sessionId);
	io.to(sessionId).emit('joined', sessionId);
	sessionCount++;

	sockbase.onLogin(io, socket, null);
	
	socket.on('*', function(msg) {
				
		isLoggedIn(socket.request, null, function(){
			if (clientSockets[socket.request.sessionID]){
				callbacks[msg.data[0]](io, socket, msg.data[1]);
			}
			else{
				sockbase.onLogout(io, socket, null);
				socket.emit('failure', 'you are logged out');
				socket.disconnect();
				console.log('disconnect');
			}
		});
	});
});

app.get('/', function(req, res){
	res.render('index.ejs');
});

app.post('/login', function(req, res, next){
	req.session.role = req.body.role;
	
	if (req.body.action === 'facebook'){
		passport.authenticate('facebook', { scope : 'email' })(req, res, next);
	}
	else if (req.body.action === 'twitter'){
		passport.authenticate('twitter', { scope : 'email' })(req, res, next);
	}
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
	req.user.role = req.session.role;
	
	if (clientSockets[req.sessionID]){
		clientSockets[req.sessionID] = null;
	}
	
	var client = {};
	if (req.user.facebook){
		client = {
			user : {
				name : req.user.facebook.name,
				profilePic : req.user.facebook.profilePic,
				role : req.user.role
			}
		};
	}
	else{
		client = {
			user : {
				name : req.user.twitter.name,
				profilePic : req.user.twitter.profilePic,
				role : req.user.role
			}
		};
	}
	
	res.render('dashboard.ejs', client);
});

app.get('/logout', function(req, res){
	
	console.log('logout');
	
	var socket = clientSockets[req.sessionID];
	if (socket){
		delete clientSockets[req.sessionID];
	}
	
	req.session.destroy(function(){
		res.redirect('/');
	});
});

http.listen(3000, function() {
	console.log('listening on *:3000');
});