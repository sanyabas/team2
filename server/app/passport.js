'use strict';

const UserModel = require('./models/User');

module.exports = function (passport) {
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await UserModel.findById(id).exec();

            done(null, user);
        } catch (error) {
            done(error);
        }
    });
};
