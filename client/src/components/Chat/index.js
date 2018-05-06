import React, { Component } from 'react';
import ReactPropTypes from 'prop-types';
import { observer } from 'mobx-react';
import ChatHeader from './ChatHeader';
import ChatHistory from './ChatHistory';
import ChatInput from './ChatInput';
import EmojiPicker from 'emoji-picker-react';
import styles from './index.css';
import { inject } from 'mobx-react';
import { PropTypes as MobxPropsTypes } from 'mobx-react';
import InputMoment from 'input-moment';

@inject('reactionSelectorState', 'alarmState', 'state') @observer
export default class Chat extends Component {
    constructor(props) {
        super(props);
    }

    static propTypes = {
        reactionSelectorState: MobxPropsTypes.observableObject,
        alarmState: MobxPropsTypes.observableObject,
        state: MobxPropsTypes.observableObject,

        name: ReactPropTypes.string,
        avatar: ReactPropTypes.string,
        children: ReactPropTypes.array,
        inviteLink: ReactPropTypes.string,
        dialog: ReactPropTypes.bool
    };

    sendReaction(code) {
        this.props.reactionSelectorState.sendReaction(code);
    }

    changeTime(time) {
        this.props.alarmState.setTime(time);
    }

    saveAlarm() {
        this.props.alarmState.save();
    }

    render() {
        const emojiPickerStyle = {
            top: this.props.reactionSelectorState.top,
            left: this.props.reactionSelectorState.left
        };

        const alarmStyle = {
            top: this.props.alarmState.top,
            left: this.props.alarmState.left
        };

        return (
            <div className={styles.Wrapper}
                onClick={this.props.state.closeProfile.bind(this.props.state)}>
                {this.props.alarmState.show &&
                <div className={styles.DatetimePicker} style={alarmStyle}>
                    <InputMoment
                        lol={this.props.alarmState.key}
                        moment={this.props.alarmState.moment}
                        minStep={1}
                        hourStep={1}
                        onChange={this.changeTime.bind(this)}
                        onSave={this.saveAlarm.bind(this)}
                    />
                </div>
                }
                {this.props.reactionSelectorState.show &&
                    <div className={styles.EmojiPicker} style={emojiPickerStyle}>
                        <EmojiPicker
                            onEmojiClick={this.sendReaction.bind(this)}/>
                    </div>
                }
                <ChatHeader avatar={this.props.avatar}
                    name={this.props.name}
                    status={'online'}
                    inviteLink={this.props.inviteLink}
                    dialog={this.props.dialog}/>
                <ChatHistory/>
                <ChatInput/>
            </div>
        );
    }
}
