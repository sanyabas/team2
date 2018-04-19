/*eslint-disable */
import React, { Component } from 'react';
import { PropTypes } from 'mobx-react';
import ReactPropTypes from 'prop-types';
import { observer } from 'mobx-react';
import ChatList from '../ChatList';
import Profile from '../Profile';
import Chat from '../Chat';
import ServiceMessage from '../Chat/ChatHistory/ServiceMessage';
import ChatItem from '../ChatList/ChatItem';
import * as States from '../../enum/LoadState';
import UserMessage from '../Chat/ChatHistory/UserMessage';
import styles from './index.css';

@observer
export default class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            showContacts: true,
            showChat: true,
            showProfile: false,
            currentChat: ''
        };
    }

    static propTypes = {
        store: ReactPropTypes.shape({
            addMessage: ReactPropTypes.func,
            chats: PropTypes.observableArray,
            profile: PropTypes.observableObject,
            chatHistories: PropTypes.observableArrayOf(PropTypes.observableObject),
            searchResult: PropTypes.observableArray
        }),
        worker: ReactPropTypes.object
    };

    componentDidMount() {
        this.props.worker.getProfile();
    }

    componentWillMount() {
        this.openContacts = this.openContacts.bind(this);
        this.openChat = this.openChat.bind(this);
        this.openProfile = this.openProfile.bind(this);

        this.closeContacts = this.closeContacts.bind(this);
        this.closeChat = this.closeChat.bind(this);
        this.closeProfile = this.closeProfile.bind(this);

        this.transitFromChatToContacts = this.transitFromChatToContacts.bind(this);
        this.transitFromProfileToChat = this.transitFromProfileToChat.bind(this);
    }

    transitFromChatToContacts() {
        this.closeChat();
        this.openContacts();
    }

    transitFromProfileToChat() {
        this.closeProfile();
        this.openChat();
    }

    changeChat(chat) {
        this.setState({ currentChat: chat });
    }

    render() {
        const currentChat = this.state.currentChat === 'olesya' ? this.props.store.olesyaChat :
            this.props.store.chats.find(chat => chat._id === this.state.currentChat);
        const chats = this.props.store.chats.map(chat => {
            const chatHistory = this.props.store.chatHistories[chat._id];
            let lastMessage = '';
            if (chatHistory && chatHistory.length > 0) {
                lastMessage = chatHistory[chatHistory.length - 1].body;
            }

            return (
                <ChatItem key={chat._id} photoURL={chat.avatar} name={chat.name}
                    lastMessage={lastMessage}
                    lastMessageDate={new Date()}
                    onClick={this.changeChat.bind(this, chat._id)}/>
            );
        });

        chats.unshift(
            <ChatItem key={'olesya'} photoURL={this.props.store.olesyaChat.avatar}
                name={'Olesya'}
                lastMessage={''}
                lastMessageDate={new Date()}
                onClick={this.changeChat.bind(this, 'olesya')}/>
        );

        const chatHistory = this.props.store.chatHistories
            .filter(history => history.chatId === this.state.currentChat._id)[0];

        let chatHistoryToRender;
        if (chatHistory) {
            chatHistoryToRender = chatHistory.map(message => (
                <UserMessage key={message._id}
                    fromMe={message.from === this.props.store.profile._id} name={message.name}
                    body={message.body} date={message.date || new Date()}/>
            ));
        }

        let state;
        let message = '';
        // eslint-disable-next-line react/prop-types
        let loadingState = this.props.store.loadingState;

        if (loadingState === States.LOADED) {
            state = false;
        }

        if (loadingState === States.LOAD_CONTACTS) {
            state = true;
            message = 'Loading contacts';
        }

        if (loadingState === States.LOAD_PROFILE) {
            state = true;
            message = 'Loading profile';
        }

        if (loadingState === States.ADD_CONTACT) {
            state = true;
            message = 'Adding contact';
        }

        return (
            <div className={styles.Wrapper}>
                <div className={styles.LoadingScreen} style={{ display: state ? 'flex' : 'none' }}>
                    <div className={styles.LoaderWrapper}>
                        <div className={styles.Loader}/>
                    </div>
                    <div className={styles.LoaderText}>{message}</div>
                </div>
                {this.state.showContacts &&
                <ChatList chats={this.props.store.chats}
                    currentChat={currentChat}
                    searchByLogin={this.props.worker.searchByLogin.bind(this.props.worker)}
                    searchResult={this.props.store.searchResult}
                    addContact={this.props.worker.addContact.bind(this.props.worker)}>
                    {chats}
                </ChatList>
                }
                {currentChat
                    ? <Chat name={currentChat.name}
                        chatId={currentChat._id}
                        chatHistories={this.props.store.chatHistories}
                        addMessage={this.props.store.addMessage.bind(this.props.store)}
                        sendMessage={this.props.worker.sendMessage.bind(this.props.worker)}
                        profile={this.props.store.profile}
                        avatar={currentChat.avatar}
                        askOlesya={this.props.worker.askOlesya.bind(this.props.worker)}
                        transitFromChatToContacts={this.transitFromChatToContacts}>
                        {chatHistoryToRender}
                    </Chat>
                    : <div className={styles.StubWrapper}>
                        <ServiceMessage text="Please select a chat to start messaging" />
                    </div>
                }
                {this.state.showProfile &&
                <Profile profile={this.props.store.profile}
                    closeProfile={this.closeProfile} />}
            </div>
        );
    }

    openContacts() {
        this.setState({ showContacts: true });
    }

    openChat() {
        this.setState({ showChat: true });
    }

    openProfile() {
        this.setState({ showProfile: true });
    }

    closeContacts() {
        this.setState({ showContacts: false });
    }

    closeChat() {
        this.setState({ showChat: false });
    }

    closeProfile() {
        this.setState({ showProfile: false });
    }
}

