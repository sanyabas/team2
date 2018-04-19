'use strict';

const config = require('config');
const passportGithub = require('passport-github');
const User = require('./models/User');
const GithubAvatar = require('./tools/githubAvatar');

const strategy = new passportGithub.Strategy(
    {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${config.get('host')}/login/return`
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            const user = await User.findOne({ githubId: profile.id }).exec();
            if (user === null) {
                throw new Error('User doesnt exist, creating');
            }
            console.info(`User exist ${user}`);
            done(null, user);
        } catch (error) {
            console.info(error.message);

            const user = new User({
                login: profile.username,
                name: profile.displayName,
                githubId: profile.id,
                contacts: [],
                chats: [],
                date: Date.now(),
                avatar: new GithubAvatar(profile.username, 200).toImgSrc()
            });

            await user.save();

            done(null, user);
        }
    }
);

module.exports = { strategy };
