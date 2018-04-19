'use strict';

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    login: { type: String, index: true, unique: true },
    name: String,
    avatar: String,
    githubId: String,
    createdAt: { type: Date, default: Date.now() },
    chats: [{ type: mongoose.Schema.ObjectId, ref: 'Chat' }],
    contacts: [{ type: mongoose.Schema.ObjectId, ref: 'User' }]
});

userSchema.methods.addContact = async function (otherId) {
    this.contacts.push(otherId);

    return this.save();
};

userSchema.methods.addChat = function (chatId) {
    this.chats.push(chatId);

    return this.save();
};

module.exports = mongoose.model('User', userSchema);
