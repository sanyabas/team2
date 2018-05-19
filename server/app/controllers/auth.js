'use strict';

const passport = require('passport');
const config = require('config');
const { URL } = require('url');

module.exports = app => {
    // Главная страница
    app.get(
        '/',
        (req, res) => {
            console.log(req.session);
            if (req.isAuthenticated()) {
                res.render('app', { staticPath: config.get('staticPath') });
            } else {
                res.cookie('join', req.query.join);
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
            console.log(req.cookies);
            const invite = req.cookies.join;
            if (!invite) {
                res.redirect(config.get('clientHost'));

                return;
            }
            const fullUrl = new URL(`#/join/${invite}`, config.get('clientHost'));
            res.clearCookie('join');
            res.redirect(fullUrl);
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
