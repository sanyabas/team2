'use strict';

require('dotenv').config();
const session = require('express-session');
const passport = require('passport');
const bodyParser = require('body-parser');
const config = require('config');
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const path = require('path');
const cors = require('cors');
const { createServer } = require('http');

const { setSerializers, strategy } = require('./app/tools/auth');
const routes = require('./app/routes');
const createOlesya = require('./app/tools/createOlesya');

const app = express();
const httpServer = createServer(app);
const sessionStore = new session.MemoryStore();

let timeout = 3000;

function connect() {
    mongoose.connect(process.env.DB_URL, { connectTimeoutMS: timeout }).then(
        () => console.info('Connected to database'),
        (e) => {
            console.error(e);
            timeout += 2000;
            console.info(`Attempt to connect with ${timeout} ms`);
            connect();
        });
}

connect();
createOlesya();

const corsOptions = {
    origin: 'http://localhost:8080',
    credentials: true
};

app.use(cors(corsOptions));

app.use(session({
    store: sessionStore,
    secret: process.env.EXPRESS_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: false
    }
}));

passport.use(strategy);
setSerializers(passport);

app.use(passport.initialize());
app.use(passport.session());

const viewsDir = path.join(__dirname, 'app/views');

if (config.get('debug')) {
    app.use(morgan('dev'));
    app.use(express.static(config.get('clientFiles')));
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
