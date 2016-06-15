var Appbase = require('appbase-js');
var FacebookStrategy = require('passport-facebook').Strategy;
var credentials = require('../config/credentials')

var appbaseRef = new Appbase({
	url: credentials.appbaseAuth.url,
	appname: credentials.appbaseAuth.appName,
	username: credentials.appbaseAuth.userName,
	password: credentials.appbaseAuth.password
});

module.exports = function(passport){
	passport.serializeUser(function(user, done){
		done(null, user.facebook.id);
	});

	passport.use(new FacebookStrategy({
				clientID	:	credentials.facebookAuth.clientID,
				clientSecret:	credentials.facebookAuth.clientSecret,
				callbackURL	:	credentials.facebookAuth.callbackURL,
				profileFields: ["emails", "displayName"]
			},
			function(token, refreshToken, profile, done){
				appbaseRef.search({
					type: 'user',
					body: {
						query: {
							match: {
								'facebook.id': profile.id
							}
						}
					}
				}).on('data', function(response) {
					if (response.hits.total === 0){
						appbaseRef.index({
							type: 'user',
							body: {
								'facebook'	:	{ 
									'id'	:	profile.id,
									'token':	token,
									'email':	profile.emails[0].value,
									'name'	:	profile.displayName
								}
							}
						}).on('data', function(response){
							return done(null, response._source)
						}).on('error', function(error){
							return done(error);
						});
					}
					else{
						return done(null, response.hits.hits[0]._source);
					}
					
					
				}).on('error', function(error) {
					return done(error);
					
				});
			}
		)
	);
};