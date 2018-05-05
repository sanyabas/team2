'use strict';

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    login: { type: String, index: true, unique: true },
    name: String,
    avatar: String,
    githubId: String,
    createdAt: { type: Date, default: Date.now },
    chats: [{ type: mongoose.Schema.ObjectId, ref: 'Chat' }],
    contacts: [{ type: mongoose.Schema.ObjectId, ref: 'User' }]
});

userSchema.methods.addContact = async function (otherId) {
    return this.update({ $push: { contacts: otherId } }).exec();
};

userSchema.methods.addChat = function (chatId) {
    chatId = mongoose.Types.ObjectId(chatId);
    if (this.chats.some(oldChatId => oldChatId.toString() === chatId.toString())) {
        return;
    }

    return this.update({ $push: { chats: chatId } }).exec();
};

userSchema.methods.deleteChat = function (chatId) {
    return this.update({ $pull: { chats: { _id: chatId } } }).exec();
};

module.exports = mongoose.model('User', userSchema);
