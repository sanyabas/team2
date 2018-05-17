import React from 'react';
import { PropTypes } from 'mobx-react';
import { observer, inject } from 'mobx-react';
import styles from './index.css';
import ChatEmojiPicker from '../ChatEmojiPicker';
import Preview from '../ChatPreview';

@inject('state') @observer
export default class ChatInput extends React.Component {
    constructor(props) {
        super(props);
    }

    static propTypes = {
        state: PropTypes.observableObject
    };

    submitHandler(event) {
        event.preventDefault();
        this.props.state.chatInputState.submit();
    }

    changeHandler(event) {
        event.preventDefault();
        this.props.state.chatInputState.change(event.target.value);
    }

    emojiButtonClick() {
        this.props.state.chatInputState.toggleEmojiList();
        this.chatInput.focus();
    }

    startSpeech() {
        const SpeechRecognition = window.SpeechRecognition ||
            window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognizer = new SpeechRecognition();
            recognizer.lang = 'ru-RU';
            this.props.state.chatInputState.recognizer;
            recognizer.start();
            this.props.state.chatInputState.isRecord = true;
            recognizer.onresult = event => {
                let result = event.results[event.resultIndex][0].transcript;
                console.log(result);
                this.state.chatInputState.chatInput.change(result);
                this.props.state.chatInputState.isRecord = false;
            };
        }
    }


    stopSpeech() {
        this.recognizer.stop();
        this.props.state.chatInputState.isRecord = false;
    }

    render() {
        const { chatInputState } = this.props.state;

        return (
            <div>
                {chatInputState.showEmojiList
                    ? <ChatEmojiPicker
                        onEmojiClick={chatInputState.addEmojiIntoText
                            .bind(chatInputState)}
                        onMouseLeave={chatInputState.toggleEmojiList
                            .bind(chatInputState)}/>
                    : null}
                <article className={styles.SendBar}>
                    <form id="send-message-form" className={this.props.state.mainView.isNightTheme
                        ? styles.Wrapper : styles.WrapperNight}
                    onSubmit={this.submitHandler.bind(this)}>
                        <Preview chatPreviewState={this.props.state.chatPreviewState}/>
                        <input type="text" className={this.props.state.mainView.isNightTheme
                            ? styles.Input : styles.InputNight}
                        value={chatInputState.chatInput}
                        placeholder=" Write a message..."
                        onChange={this.changeHandler.bind(this)}
                        ref={(input) => {
                            this.chatInput = input;
                        }}
                        autoFocus/>
                        {
                            this.props.state.chatInputState.isRecord
                                ? <button form="send-message-form" type="submit"
                                    className={`${styles.MicroButtonOn}`}
                                    onClick={this.stopSpeech.bind(this)}
                                >
                                    <i className="material-icons">micro</i>
                                </button>
                                : <button form="send-message-form" type="submit"
                                    className={`${styles.MicroButtonOff}`}
                                    onClick={this.startSpeech.bind(this)}
                                >
                                    <i className="material-icons">micro</i>
                                </button>
                        }
                        <button type="button" className={`${styles.EmojiButton} ${styles.Button}`}
                            onClick={this.emojiButtonClick.bind(this)}>
                            <i className="material-icons">tag_faces</i>
                        </button>
                        <button form="send-message-form" type="submit"
                            className={`${styles.SendButton} ${styles.Button}`}>
                            <i className="material-icons">send</i>
                        </button>
                    </form>
                </article>
            </div>
        );
    }
}
