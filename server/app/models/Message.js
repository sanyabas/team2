'use strict';

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    from: { type: mongoose.Schema.ObjectId, ref: 'User' },
    chatId: { type: mongoose.Schema.ObjectId, ref: 'Chat' },
    body: String,
    createdAt: { type: Date, default: Date.now() }
});

module.exports = mongoose.model('Message', messageSchema);
