module.exports = {
	'appbaseAuth'	:	{
		
		'url'		:	'https://scalr.api.appbase.io',
		'appName'	:	'APP NAME FROM APPBASE DASHBOARD',
		'userName'	:	'USER NAME FROM APPBASE DASHBOARD',
		'password'	:	'PASSWORD FROM APPBASE DASHBOARD'
	},
	'facebookAuth' : {
		'clientID'		: 	'GET YOUR CLIENT ID FROM FACEBOOK',
		'clientSecret'	:	'GET YOUR CLIENT SECRET FROM FACEBOOK',
		'callbackURL'	:	'http://localhost:3000/auth/facebook/callback'
	},
	'twitterAuth'	: {
		'consumerKey'	:	'GET YOUR CONSUMER KEY FROM TWITTER',
		'consumerSecret':	'GET YOUR CONSUMER SECRET FROM TWITTER',
		'callbackURL'	:	'http://localhost:3000/auth/twitter/callback'
	},
	'mongodb'	:	{
		'url'			:	'YOUR MONGODB URL'
	}
};