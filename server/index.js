'use strict';

require('dotenv').config();
const session = require('express-session');
const passport = require('passport');
const bodyParser = require('body-parser');
const config = require('config');
const express = require('express');
const { connect, setTimeout } = require('hruhru');
const morgan = require('morgan');
const path = require('path');
const cors = require('cors');
const { createServer } = require('http');

const makePassport = require('./app/passport');
const { strategy } = require('./app/authStrategy');
const routes = require('./app/routes');

const app = express();
const httpServer = createServer(app);
const sessionStore = new session.MemoryStore();

connect(process.env.DB_URL, process.env.DB_TOKEN);
setTimeout(2 * 1000);

const corsOptions = {
    origin: 'http://localhost:9000',
    credentials: true
};

app.use(cors(corsOptions));

passport.use(strategy);
app.use(session({
    store: sessionStore,
    secret: process.env.EXPRESS_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: false
    }
}));

if (config.get('debug')) {
    app.use(express.static(config.get('staticPath')));
}

makePassport(passport);
app.use(passport.initialize());
app.use(passport.session());

const viewsDir = path.join(__dirname, 'app/views');

if (config.get('debug')) {
    app.use(morgan('dev'));
}

app.set('view engine', 'hbs');
app.set('views', viewsDir);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

routes(app);

const port = process.env.PORT || config.get('port');

require('./app/websockets')(httpServer, sessionStore);

httpServer.listen(port, () => {
    console.info(`Server started on ${port}`);
    console.info(`Open ${config.get('host')}/`);
});

module.exports = app;
