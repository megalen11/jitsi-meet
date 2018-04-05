// @flow

import React, { Component } from 'react';
import { Text, View } from 'react-native';
import { connect } from 'react-redux';

import { translate } from '../../i18n';
import { JitsiParticipantConnectionStatus } from '../../lib-jitsi-meet';
import {
    MEDIA_TYPE,
    shouldRenderVideoTrack,
    VideoTrack
} from '../../media';
import { prefetch } from '../../../mobile/image-cache';
import { Container, TintedView } from '../../react';
import { getTrackByMediaTypeAndParticipant } from '../../tracks';

import Avatar from './Avatar';
import {
    getAvatarURL,
    getParticipantById,
    getParticipantDisplayName
} from '../functions';
import styles from './styles';

/**
 * The type of the React {@link Component} props of {@link ParticipantView}.
 */
type Props = {

    /**
     * The indicator which determines whether conferencing is in audio-only
     * mode.
     *
     * @private
     */
    _audioOnly: boolean,

    /**
     * The source (e.g. URI, URL) of the avatar image of the participant with
     * {@link #participantId}.
     *
     * @private
     */
    _avatar: string,

    /**
     * The connection status of the participant. Her video will only be rendered
     * if the connection status is 'active'; otherwise, the avatar will be
     * rendered. If undefined, 'active' is presumed.
     *
     * @private
     */
    _connectionStatus: string,

    /**
     * The name of the participant which this component represents.
     *
     * @private
     */
    _participantName: string,

    /**
     * The video Track of the participant with {@link #participantId}.
     */
    _videoTrack: Object,

    /**
     * The avatar size.
     */
    avatarSize: number,

    /**
     * The ID of the participant (to be) depicted by {@link ParticipantView}.
     *
     * @public
     */
    participantId: string,

    /**
     * True if the avatar of the depicted participant is to be shown should the
     * avatar be available and the video of the participant is not to be shown;
     * otherwise, false. If undefined, defaults to true.
     */
    showAvatar: boolean,

    /**
     * True if the video of the depicted participant is to be shown should the
     * video be available. If undefined, defaults to true.
     */
    showVideo: boolean,

    /**
     * The style, if any, to apply to {@link ParticipantView} in addition to its
     * default style.
     */
    style: Object,

    /**
     * The function to translate human-readable text.
     */
    t: Function,

    /**
     * Indicates if the connectivity info label should be shown, if appropriate.
     * It will be shown in case the connection is interrupted.
     */
    useConnectivityInfoLabel: boolean,

    /**
     * The z-order of the {@link Video} of {@link ParticipantView} in the
     * stacking space of all {@code Video}s. For more details, refer to the
     * {@code zOrder} property of the {@code Video} class for React Native.
     */
    zOrder: number
};

/**
 * Implements a React Component which depicts a specific participant's avatar
 * and video.
 *
 * @extends Component
 */
class ParticipantView extends Component<Props> {
    /**
     * Renders the connection status label, if appropriate.
     *
     * @param {string} connectionStatus - The status of the participant's
     * connection.
     * @private
     * @returns {ReactElement|null}
     */
    _renderConnectionInfo(connectionStatus) {
        let messageKey;

        switch (connectionStatus) {
        case JitsiParticipantConnectionStatus.INACTIVE:
            messageKey = 'connection.LOW_BANDWIDTH';
            break;
        case JitsiParticipantConnectionStatus.INTERRUPTED:
            messageKey = 'connection.USER_CONNECTION_INTERRUPTED';
            break;
        default:
            return null;
        }

        const {
            avatarSize,
            _participantName: displayName,
            t
        } = this.props;

        // XXX Consider splitting this component into 2: one for the large view
        // and one for the thumbnail. Some of these don't apply to both.
        const containerStyle = {
            ...styles.connectionInfoContainer,
            width: avatarSize * 1.5
        };

        return (
            <View
                pointerEvents = 'box-none'
                style = { containerStyle }>
                <Text style = { styles.connectionInfoText }>
                    { t(messageKey, { displayName }) }
                </Text>
            </View>
        );
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        const {
            _avatar: avatar,
            _connectionStatus: connectionStatus,
            _videoTrack: videoTrack
        } = this.props;

        // Is the video to be rendered?
        // FIXME It's currently impossible to have true as the value of
        // waitForVideoStarted because videoTrack's state videoStarted will be
        // updated only after videoTrack is rendered.
        // XXX Note that, unlike on web, we don't render video when the
        // connection status is interrupted, this is because the renderer
        // doesn't retain the last frame forever, so we would end up with a
        // black screen.
        const waitForVideoStarted = false;
        const renderVideo
            = !this.props._audioOnly
                && (connectionStatus
                    === JitsiParticipantConnectionStatus.ACTIVE)
                && shouldRenderVideoTrack(videoTrack, waitForVideoStarted);

        // Is the avatar to be rendered?
        const renderAvatar = Boolean(!renderVideo && avatar);

        // If the connection has problems we will "tint" the video / avatar.
        const useTint
            = connectionStatus === JitsiParticipantConnectionStatus.INACTIVE
                || connectionStatus
                    === JitsiParticipantConnectionStatus.INTERRUPTED;

        return (
            <Container
                style = {{
                    ...styles.participantView,
                    ...this.props.style
                }}>

                { renderVideo

                    // The consumer of this ParticipantView is allowed to forbid
                    // showing the video if the private logic of this
                    // ParticipantView determines that the video could be
                    // rendered.
                    && _toBoolean(this.props.showVideo, true)
                    && <VideoTrack
                        videoTrack = { videoTrack }
                        waitForVideoStarted = { waitForVideoStarted }
                        zOrder = { this.props.zOrder } /> }

                { renderAvatar

                    // The consumer of this ParticipantView is allowed to forbid
                    // showing the avatar if the private logic of this
                    // ParticipantView determines that the avatar could be
                    // rendered.
                    && _toBoolean(this.props.showAvatar, true)
                    && <Avatar
                        size = { this.props.avatarSize }
                        uri = { avatar } /> }

                { useTint

                    // If the connection has problems, tint the video / avatar.
                    && <TintedView /> }

                { this.props.useConnectivityInfoLabel
                    && this._renderConnectionInfo(connectionStatus) }
            </Container>
        );
    }
}

/**
 * Converts the specified value to a boolean value. If the specified value is
 * undefined, returns the boolean value of undefinedValue.
 *
 * @param {any} value - The value to convert to a boolean value should it not be
 * undefined.
 * @param {any} undefinedValue - The value to convert to a boolean value should
 * the specified value be undefined.
 * @private
 * @returns {boolean}
 */
function _toBoolean(value, undefinedValue) {
    return Boolean(typeof value === 'undefined' ? undefinedValue : value);
}

/**
 * Maps (parts of) the redux state to the associated {@link ParticipantView}'s
 * props.
 *
 * @param {Object} state - The redux state.
 * @param {Object} ownProps - The React {@code Component} props passed to the
 * associated (instance of) {@code ParticipantView}.
 * @private
 * @returns {{
 *     _audioOnly: boolean,
 *     _avatar: string,
 *     _connectionStatus: string,
 *     _participantName: string,
 *     _videoTrack: Track
 * }}
 */
function _mapStateToProps(state, ownProps) {
    const { participantId } = ownProps;
    const participant
        = getParticipantById(
            state['features/base/participants'],
            participantId);
    let avatar;
    let connectionStatus;
    let participantName;

    if (participant) {
        avatar = getAvatarURL(participant);
        connectionStatus = participant.connectionStatus;
        participantName = getParticipantDisplayName(state, participant.id);

        // Avatar (on React Native) now has the ability to generate an
        // automatically-colored default image when no URI/URL is specified or
        // when it fails to load. In order to make the coloring permanent(ish)
        // per participant, Avatar will need something permanent(ish) per
        // perticipant, obviously. A participant's ID is such a piece of data.
        // But the local participant changes her ID as she joins, leaves.
        // TODO @lyubomir: The participants may change their avatar URLs at
        // runtime which means that, if their old and new avatar URLs fail to
        // download, Avatar will change their automatically-generated colors.
        avatar || participant.local || (avatar = `#${participant.id}`);

        // ParticipantView knows before Avatar that an avatar URL will be used
        // so it's advisable to prefetch here.
        avatar && prefetch({ uri: avatar });
    }

    return {
        _audioOnly: state['features/base/conference'].audioOnly,
        _avatar: avatar,
        _connectionStatus:
            connectionStatus
                || JitsiParticipantConnectionStatus.ACTIVE,
        _participantName: participantName,
        _videoTrack:
            getTrackByMediaTypeAndParticipant(
                state['features/base/tracks'],
                MEDIA_TYPE.VIDEO,
                participantId)
    };
}

export default translate(connect(_mapStateToProps)(ParticipantView));
