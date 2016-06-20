var Appbase = require('appbase-js');
var FacebookStrategy = require('passport-facebook').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;
var credentials = require('../config/credentials')

var appbaseRef = new Appbase({
	url: credentials.appbaseAuth.url,
	appname: credentials.appbaseAuth.appName,
	username: credentials.appbaseAuth.userName,
	password: credentials.appbaseAuth.password
});

module.exports = function(passport){
	passport.serializeUser(function(user, done){
		done(null, user);
	});
	
	passport.deserializeUser(function(user, done){
		done(null, user);
	});

	passport.use(new FacebookStrategy({
				clientID	:	credentials.facebookAuth.clientID,
				clientSecret:	credentials.facebookAuth.clientSecret,
				callbackURL	:	credentials.facebookAuth.callbackURL,
				profileFields: ["emails", "displayName", "profileUrl", "photos"]
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
						var user = {
							'facebook'	:	{ 
								'id'			:	profile.id,
								'token'			:	token,
								'email'			:	profile.emails[0].value,
								'name'			:	profile.displayName,
								'profilePic'	:	profile.photos[0].value
							}
						};
								
						appbaseRef.index({
							type: 'user',
							body: user
							
						}).on('data', function(response){
							return done(null, user);
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
	
	passport.use(new TwitterStrategy({
			consumerKey		:	credentials.twitterAuth.consumerKey,
			consumerSecret	:	credentials.twitterAuth.consumerSecret,
			callbackURL		:	credentials.twitterAuth.callbackURL
		}, 
		function(token, refreshToken, profile, done){
			appbaseRef.search({
				type: 'user',
				body: {
					query: {
						match: {
							'twitter.id': profile.id
						}
					}
				}
			}).on('data', function(response) {
				if (response.hits.total === 0){
					var user = {
						'twitter'	:	{ 
							'id'			:	profile.id,
							'token'			:	token,
							'username'		:	profile.username,
							'name'			:	profile.displayName,
							'profilePic'	:	profile.photos[0].value
						}
					};
							
					appbaseRef.index({
						type: 'user',
						body: user
						
					}).on('data', function(response){
						return done(null, user);
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
	));
};