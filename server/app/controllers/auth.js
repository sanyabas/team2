'use strict';

const passport = require('passport');
const config = require('config');
const { URL } = require('url');

module.exports = app => {
    // Главная страница
    app.get(
        '/',
        (req, res) => {
            if (req.query.join) {
                const fullUrl = new URL(`#/join/${req.query.join}`, config.get('clientHost'));
                if (req.isAuthenticated()) {
                    res.redirect(fullUrl);
                } else {
                    req.session.join = fullUrl;
                    res.redirect(`${config.get('host')}/login`);
                }

                return;
            }
            if (req.isAuthenticated()) {
                res.render('app', { staticPath: config.get('staticPath') });
            } else {
                res.redirect(`${config.get('host')}/login`);
            }
        }
    );

    // Маршрут для входа
    app.get(
        '/login',
        // Аутентифицируем пользователя через стратегию GitHub
        // Если не удается, отправляем код 401
        passport.authenticate('github')
    );

    // Маршрут, на который пользователь будет возвращён после авторизации на GitHub
    app.get(
        '/login/return',
        // Заканчиваем аутентифицировать пользователя
        // Если не удачно, то отправляем на /
        passport.authenticate('github', { failureRedirect: '/error' }),
        (req, res) => {
            const invite = req.session.join;
            if (!invite) {
                res.redirect(config.get('clientHost'));
            } else {
                res.redirect(req.session.join);
            }
        }
    );


    // Маршрут для выхода пользователя
    app.get(
        '/logout',
        (req, res) => {
            // Удаляем сессию пользователя из хранилища
            req.logout();
            // И отправляем на /
            res.redirect('/');
        }
    );

};
