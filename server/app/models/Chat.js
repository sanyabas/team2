'use strict';

const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    avatar: String,
    name: String,
    dialog: Boolean,
    users: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now },
    inviteLink: { type: String, index: true }
});

chatSchema.methods.addUser = function (personId) {
    personId = mongoose.Types.ObjectId(personId);
    if (this.users.some(userId => userId.equals(personId))) {
        return;
    }

    return this.update({ $push: { users: personId } }).exec();
};

chatSchema.methods.containsUser = function (userName) {
    return this.users.indexOf(mongoose.Types.ObjectId(userName)) !== -1;
};

chatSchema.methods.rename = function (name) {
    return this.update({ name }).exec();
};

chatSchema.methods.deleteUser = function (uid) {
    return this.update({ $pull: { users: { _id: uid } } }).exec();
};

module.exports = mongoose.model('Chat', chatSchema);
