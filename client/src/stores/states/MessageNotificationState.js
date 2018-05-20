/* eslint-disable no-invalid-this */
import { observable, action, autorun } from 'mobx';

export default class MessageNotificationState {

    constructor(dataStore, chatListState) {
        this.dataStore = dataStore;
        this.chatListState = chatListState;
        this.isActive = false;
        this.lastReceivedMessageId = '';

        autorun(() => {
            window.onfocus = () => (this.isActive = false);
            window.onblur = () => (this.isActive = true);
            if (this.dataStore.lastReceivedMessage && !this.ignore &&
                this.lastReceivedMessageId !== this.dataStore.lastReceivedMessage._id) {
                const notificationMessage = this.dataStore.lastReceivedMessage;
                this.lastReceivedMessageId = notificationMessage._id;
                const title = notificationMessage.fromLogin;
                const body = this.createBodyForNotification(notificationMessage);
                const image = this.createImageForNotification(notificationMessage);

                const options = {
                    tag: Date.now(),
                    body: body,
                    icon: 'http://ipic.su/7yzXt5',
                    lang: 'en',
                    dir: 'ltr',
                    vibrate: [200, 100, 200],
                    image: image
                };


                const isCurrentChat = !this.isActive &&
                    this.checkCurrentChat(chatListState, notificationMessage);

                if (!isCurrentChat) {
                    this.title = title;
                    this.options = options;
                }
            }
        });
    }

    @observable ignore = true;
    @observable title = '';
    @observable options = {};

    @action handlePermissionGranted() {
        this.ignore = false;
    }

    @action handlePermissionDenied() {
        this.ignore = true;
    }

    @action handleNotSupported() {
        this.ignore = true;
    }

    createBodyForNotification(messageForNotification) {
        let body = messageForNotification.body;
        if (!body) {
            return '';
        }
        body = body.replace(/<p>/g, '')
            .replace(/<em>/g, '')
            .replace(/<code>/g, '')
            .replace(/<strong>/g, '')
            .replace(/<a.*?>/g, '')
            .replace(/<\/p>/g, '')
            .replace(/<\/em>/g, '')
            .replace(/<\/code>/g, '')
            .replace(/<\/strong>/g, '')
            .replace(/<\/a>/g, '');

        return body;
    }

    createImageForNotification(messageForNotification) {
        let image;
        if (messageForNotification.attachments &&
            messageForNotification.attachments.length) {
            image = messageForNotification.attachments[0];
        }

        return image;
    }

    checkCurrentChat(chatListState, messageForNotification) {
        let isCurrentChat = false;
        if (chatListState.currentChat) {
            isCurrentChat = chatListState.currentChat._id === messageForNotification.chatId;
        }

        return isCurrentChat;
    }

    handleNotificationOnClick(e) {
        e.target.close();
        this.chatListState.selectChat(this.dataStore.chatList
            .find((chat) => (chat._id === this.dataStore.lastReceivedMessage.chatId)));
    }

    handleNotificationOnError(e, tag) {
        console.info(e, 'Notification error tag:' + tag);
    }
}
