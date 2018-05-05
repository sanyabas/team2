import Worker from './message-worker';
import { getCookie } from '../utils/cookie';
import * as Types from '../enum/WSActionType';

export class WorkerWrapper {
    constructor() {
        this._worker = new Worker();

        this._worker.onmessage = e => this._handleResponse(e.data);
        this._worker.postMessage({
            action: 'auth',
            token: getCookie('connect.sid').split(':')[1].split('.')[0]
        });
        this._handlers = {};
    }

    getMessages({ chatId, offset, limit }) {
        this._worker.postMessage({ action: 'GetMessages', value: { chatId, offset, limit } });
    }

    getProfile() {
        this._worker.postMessage({ action: 'GetProfile' });
    }

    getChatList() {
        this._worker.postMessage({ action: 'GetChatList' });
    }

    uploadAvatar(avatar) {
        this._worker.postMessage({ action: 'UploadAvatar', value: avatar });
    }

    addContact(userId) {
        this._worker.postMessage({ action: 'AddContact', value: userId });
    }

    sendMessage({ chatId, text, tempId, attachments }) {
        this._worker
            .postMessage({ action: 'SendMessage', value: { chatId, text, tempId, attachments } });
    }

    sendReaction(code, messageId) {
        this._worker.postMessage({
            action: 'SendReaction',
            value: { code, messageId }
        });
    }

    deleteProfile(userId) {
        this._worker.postMessage({ action: 'DeleteProfile', value: { userId } });
    }

    searchByLogin(login) {
        this._worker.postMessage({ action: 'SearchByLogin', value: login });
    }

    uploadImage(image) {
        this._worker.postMessage({ action: 'UploadImage', value: image });
    }

    setAlarm(time, messageId) {
        const now = Date.now();

        this._worker.postMessage({
            action: 'SetAlarm',
            value: { time: time * 1000, messageId, now }
        });
    }

    createChat(userIds) {
        this._worker.postMessage({ action: 'CreateChat', value: userIds });
    }

    revokeLink(chatId) {
        this._worker.postMessage({ action: 'RevokeLink', value: chatId });
    }

    getContactList() {
        this._worker.postMessage({ action: 'GetContactList' });
    }

    joinChat(inviteLink) {
        this._worker.postMessage({ action: 'JoinChat', value: inviteLink });
    }

    renameChat({ chatId, name }) {
        this._worker.postMessage({ action: 'RenameChat', value: { chatId, name } });
    }

    leaveChat(chatId) {
        this._worker.postMessage({ action: 'LeaveChat', value: chatId });
    }

    _handleResponse(response) {
        const handlers = this._handlers[response.action];

        if (!handlers) {
            throw new Error(`No handlers for ${response.action}`);
        }

        if (response.type === Types.RESPONSE) {
            handlers.forEach(handler => handler(null, response.result.value));

            return;
        }

        if (response.type === Types.EMIT) {
            handlers.forEach(handler => handler(null, response.result));
        }
    }

    subscribe(event, cb) {
        if (!this._handlers[event]) {
            this._handlers[event] = [];
        }

        this._handlers[event].push(cb);

        return () => {
            this._handlers[event] = this._handlers[event].filter(handler => cb !== handler);
        };
    }
}
