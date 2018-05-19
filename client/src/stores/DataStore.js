/* eslint-disable no-invalid-this */
import { observable, action } from 'mobx';
import * as States from '../enum/LoadState';
import { v4 as uuid } from 'uuid';

export default class DataStore {

    constructor(webWorker) {
        this.webWorker = webWorker;
        this.loadProfile();

        this._messagesForSend = {};
    }

    @observable loadingState = States.LOADED;

    @observable profile = {};

    @observable chatList = [];

    @observable contactList = [];

    @observable chatHistories = new Map();

    @observable lastReceivedMessage = {};

    @action setChatHistory = (chatId, messages, totalCount) => {
        const chatHistory = this.chatHistories.get(chatId);
        if (chatHistory) {
            chatHistory.messages.unshift(...messages);
            chatHistory.totalCount = totalCount;
        } else {
            this.chatHistories.set(chatId, { messages, totalCount });
        }
    };

    @action setLoadingState = (state) => {
        this.loadingState = state;
    };

    @action setProfile = (profile) => {
        this.profile = profile;
    };

    @action addChats = (chats) => {
        this.chatList.push(...chats.map(initChat.bind(this)));
        chats.forEach(chat => {
            if (!this.chatHistories.has(chat._id)) {
                this.chatHistories.set(chat._id, { messages: [], totalCount: 0 });
            }
        });
    };

    @action addReaction = (result) => {
        const index = this.chatHistories
            .get(result.chatId)
            .messages.findIndex(msg => msg._id === result.messageId);

        if (index !== -1) {
            const message = this.chatHistories.get(result.chatId).messages[index];
            if (!message.reactions) {
                message.reactions = {};
            }

            if (!message.reactions[result.code]) {
                message.reactions[result.code] = [];
            }

            if (message.reactions[result.code].some(r => r.uid === result.uid)) {
                message.reactions[result.code] = message
                    .reactions[result.code]
                    .filter(r => r.uid !== result.uid);
            } else {
                message.reactions[result.code].push({
                    uid: result.uid,
                    code: result.code
                });
            }

            if (!message.reactions[result.code].length) {
                delete message.reactions[result.code];
            }

            message.reactions = Object.assign({}, message.reactions);

            this.chatHistories.get(result.chatId).messages[index] = Object.assign({}, message);
        }
    };

    @action addMessage = (message) => {
        this.liftChat(message);
        this.chatHistories.get(message.chatId).messages.push(message);
        this.lastReceivedMessage = message;
    };

    @action addContact = (userId) => {
        this.loadingState = States.ADD_CONTACT;
        this.webWorker.addContact(userId);
    };

    @action setAlarm = (time, messageId) => {
        this.webWorker.setAlarm(time, messageId);
    };

    @action sendReaction = (emojiCode, messageId) => {
        this.webWorker.sendReaction(emojiCode, messageId);
    };

    @action sendMessage = ({ text, chatId, attachments }) => {
        const tempId = uuid();
        const messageForStore = {
            body: text,
            from: this.profile._id,
            createdAt: Date.now(),
            attachments,
            chatId,
            tempId
        };
        this.chatHistories.get(chatId).messages.push(messageForStore);
        this._setSendMessageTimeout(messageForStore);
        this._dumpMessagesForSend();
    };

    @action loadMoreMessages = (chatId, offset, limit) => {
        this.webWorker.getMessages({ chatId, offset, limit });
    };

    @action messageDidSent = (message) => {
        clearTimeout(this._messagesForSend[message.tempId].timeout);
        delete this._messagesForSend[message.tempId];
        this._dumpMessagesForSend();

        this.liftChat(message);
        const index = this.chatHistories
            .get(message.chatId)
            .messages.findIndex(msg => msg.tempId === message.tempId);

        if (index !== -1) {
            this.chatHistories.get(message.chatId).messages[index] = message;
        }
    };

    @action searchByLogin = (userId) => {
        this.webWorker.searchByLogin(userId);
    };

    @action setAvatar = (avatar) => {
        this.profile.avatar = avatar;
    };

    @action uploadAvatar = (avatar) => {
        this.webWorker.uploadAvatar(avatar);
    };

    @action uploadImage = (image) => {
        this.webWorker.uploadImage(image);
    };

    @action loadChatList = () => {
        this.loadingState = States.LOAD_CONTACTS;
        this.webWorker.getChatList();
    };

    @action loadProfile = () => {
        this.loadingState = States.LOAD_PROFILE;
        this.webWorker.getProfile();
    };

    @action getContactList = () => {
        this.loadingState = States.LOAD_CONTACTS;
        this.webWorker.getContactList();
    };

    @action setContacts = (contacts) => {
        this.contactList = contacts;
    };

    @action createChat = (userIds) => {
        this.loadingState = States.ADD_CHAT;
        this.webWorker.createChat(userIds);
    };

    @action setChatName = (listIndex, chatName) => {
        this.chatList[listIndex].name = chatName;
    };

    @action joinChat = inviteLink => {
        this.loadingState = States.ADD_CHAT;
        this.webWorker.joinChat(inviteLink);
    };

    @action userJoined = (chat) => {
        const index = this.chatList.findIndex(listChat => listChat._id === chat._id);
        this.setChatName(index, chat.name);
        const message = {
            _id: uuid(),
            text: `${chat.users[chat.users.length - 1].login} joined the chat`,
            chatId: chat._id,
            isService: true
        };
        this.addMessage(message);
    };

    liftChat(message) {
        const index = this.chatList.findIndex(chat => chat._id === message.chatId);
        const chatCopy = this.chatList.slice();
        const chat = chatCopy.splice(index, 1)[0];
        chatCopy.unshift(chat);
        this.chatList = chatCopy;
    }

    getLastChatMessage(chat) {
        const chatHistory = this.chatHistories.get(chat._id);

        if (!(chatHistory && chatHistory.messages[chatHistory.messages.length - 1])) {
            return '';
        }

        return chatHistory.messages[chatHistory.messages.length - 1];
    }

    restoreMessagesForSend() {
        const messages = JSON.parse(localStorage.getItem('messagesForSend'));

        if (messages) {
            messages.forEach(message => {
                this._setSendMessageTimeout(message);

                if (!this.chatHistories.has(message.chatId)) {
                    this.chatHistories.set(message.chatId, { messages: [], totalCount: 0 });
                }

                this.chatHistories.get(message.chatId).messages.push(message);
            });
        }
    }

    _setSendMessageTimeout(messageData) {
        this.webWorker.sendMessage({
            text: messageData.body,
            chatId: messageData.chatId,
            tempId: messageData.tempId,
            attachments: messageData.attachments
        });

        this._messagesForSend[messageData.tempId] = {
            messageData,
            timeout: setTimeout(() => {
                this._setSendMessageTimeout(messageData);
            }, 5 * 1000)
        };
    }

    _dumpMessagesForSend() {
        const data = Object
            .keys(this._messagesForSend)
            .map(key => this._messagesForSend[key].messageData);

        localStorage.setItem('messagesForSend', JSON.stringify(data));
    }

}

function initChat(chat) {
    if (!chat) {
        return;
    }

    if (!chat.dialog) {
        return chat;
    }

    const user = chat.users.find(entry => entry._id !== this.profile._id);

    if (!user) {
        chat.name = 'Empty';
        chat.avatar = chat.users[0].avatar;

        return chat;
    }

    chat.avatar = user.avatar;
    chat.name = user.login;

    return chat;
}
