const IrcMessage = require('irc-framework/src/ircmessage');

kiwi.plugin('conference-lite', async function (kiwi, log) {
    const {
        faPhone
    } = await import('@fortawesome/free-solid-svg-icons/faPhone')
    const media = {
        props: ['buffer', 'network', 'sidebarState'],
        computed: {
            localStream() {
                const ret = this.$state.localStream;
                return ret;
            },
            peers() {
                this.state;
                this.$state.peers ??= {};
                return this.$state.peers;
            },
            connectedPeers() {
                this.state;
                return Object.fromEntries(Object.entries(this.peers).filter(([_, peer]) => {
                    log.debug("filtering peers?", "k", _, "v", peer);
                    log.debug("connected?", peer.connected);
                    return peer.connection.connectionState === 'connected';
                }));
            },
            connectingPeers() {
                this.state;
                return Object.fromEntries(Object.entries(this.peers).filter(([_, peer]) => {
                    log.debug("filtering peers?", "k", _, "v", peer);
                    log.debug("connected?", peer.connected);
                    return peer.connection.connectionState === 'connecting';
                }));
            }
        },
        methods: {
            update() {
                this.state = (this.state + 1) % 1024;
                log.debug("Updating:", this.state);
            }
        },
        data() {
            return {
                state: 0
            }
        },
    }
    const MediaViewer = kiwi.require('components/MediaViewer');
    const peer = {
        props: ['peerId', 'network', 'remote'],
        template: `
            <div class="vid-container">
                <div class="vid-overlay">
                    <div class="u-link kiwi-controlinput-button">{{ connectionState}}</div>
                    <div class="u-link kiwi-controlinput-button">{{ iceConnectionState}}</div>
                    <div class="u-link kiwi-controlinput-button">{{ signalingState}}</div>
                </div>
                <video v-resizeobserver="resizeVideo" ref="vid"  class="live-vid" autoplay playsinline :muted="muted" :data-user-id="peerId" />
            </div>
        `,
        mounted() {
            log.debug("peer vm:", this);
            this.$state.$on('conference-lite.update', () => this.$nextTick(this.resizeScreen));
            this.remote && log.debug("remote?", this.remote);
            window.addEventListener('resize', () => {
                this.resizeScreen();
            })
            this.$nextTick(() => {

                if (this.isMe) {
                    this.attachLocalStream();
                } else if (this.remote) {
                    this.attachRemoteStream();
                }
            });

        },
        computed: {
            isMe() {
                return this.peerId === 0;
            },
            connectionState() {
                return this.isMe ? 'connected' : (this?.remote?.connection?.connectionState || 'failed')
            },
            signalingState() {
                return this.isMe ? 'connected' : (this?.remote?.connection?.signalingState || 'failed')

            },
            iceConnectionState() {
                return this.isMe ? 'connected' : (this?.remote?.connection?.iceConnectionState || 'failed')
            },
            muted() {
                return this.isMe;
            }
        },
        mixins: [media],
        methods: {
            resizeScreen() {
                /**
             * @type {HTMLVideoElement}
             */
                const vid = this.$refs?.vid;
                if (!vid) return;
                const viewer = document.querySelector('.kiwi-mediaviewer.kiwi-main-mediaviewer .kiwi-mediaviewer-content');
                const width = viewer.getBoundingClientRect().width * 0.9;
                if (!this.pinned) vid.width = width / Math.max(Math.min(Object.keys(this.connectedPeers).length+1, 8), 2);
            },
            resizeVideo() {
                log.debug("resizing video...");
                this.resizeScreen();
                // this.syncDimensions();
            },
            setWidth(v) {
                if (!this.$el) return this.$nextTick(() => this.setWidth(v));
                this.$el.style.width = v;
            },
            setMaxWidth(v) {
                if (!this.$el) return this.$nextTick(() => this.setMaxWidth(v));
                this.$el.style.maxWidth = v;
            },
            setHeight(v) {
                if (!this.$el) return this.$nextTick(() => this.setHeight(v));
                this.$el.style.height = v;
            },
            setMaxHeight(v) {
                if (!this.$el) return this.$nextTick(() => this.setMaxHeight(v));
                this.$el.style.maxHeight = v;
            },
            syncDimensions() {
                if (!this.$refs.vid) return this.$nextTick(() => this.syncHeight(fallback));
                /**
                 * @type {HTMLVideoElement}
                 */
                const vid = this.$refs?.vid;
                const rect = vid.getBoundingClientRect();
                this.setHeight(rect.height + 'px')
                this.setWidth(rect.width + 'px')
            },

            attachLocalStream() {
                if (this.attempts.localStream >= this.maxAttempts.localStream) return;
                this.attempts.localStream++;
                if (!this.$refs.vid) return this.$nextTick(this.attachLocalStream);
                if (!this.$state.localStream) return setTimeout(this.attachLocalStream, 100);
                this.$refs.vid.srcObject = this.$state.localStream;
            },
            attachRemoteStream() {
                if (this.attempts.remoteStream >= this.maxAttempts.remoteStream) return;
                this.attempts.remoteStream++;
                if (!this.$refs.vid) return this.$nextTick(this.attachRemoteStream);
                if (!this.remote?.streams?.length) return setTimeout(this.attachRemoteStream, 100);
                this.$refs.vid.srcObject = this.remote.streams[0];
            }
        },
        data() {
            return {
                attempts: {
                    localStream: 0,
                    remoteStream: 0,
                },
                maxAttempts: {
                    localStream: 32,
                    remoteStream: 32,
                }
            }
        },

    };
    const conference = {
        mixins: [media],
        components: {
            // MediaViewer,
            Peer: peer
        },
        methods: {
            resize() {
                this.$state.$emit('conference-lite.resize');
            }
        },
        data() {
            return {
                peer
            }
        },
        mounted() {
            this.$state.$on('conference-lite.update', this.update);
            this.$nextTick(() => {

                this.$parent.setMaxHeight('70vh');
            });
        },
        template: `
        <div v-resizeobserver="resize">
            <div class="peers" :key="state">
                 <peer 
                    class="me"
                    :component="peer" 
                    v-bind="{ network, buffer, peerId: 0 }" 
                />
                <peer
                    v-for="(remote, id) in connectedPeers" 
                    :component="peer" 
                    v-bind="{ network, buffer, peerId: id, remote }" 
                />
            </div>
        </div>`,

    }
    kiwi.svgIcons.library.add(faPhone)
    kiwi.addUi('header_channel', {
        template: `<div ref="root">
            <a @click="joinCall" title="Conference Call">
                <svg-icon icon="phone" class="tooltip-trigger"/>
                <span class="tooltip">Conference Call</span>
            </a>
        </div>
        `,
        props: ['pluginState'],
        mixins: [media],
        data() {
            return {
            }
        },
        methods: {
            async joinCall() {
                log.debug("vm:", this);
                this.$state.emit('mediaviewer.show', {
                    component: conference,
                    componentProps: {
                        pluginState: this.pluginState,
                        sidebarState: this.sidebarState,
                        network: this.network,
                        buffer: this.buffer,
                    }
                });
                this.$state.localStream ??= await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                if (this.$state.callState) return;
                this.$state.callState = 'joining';
                /**
                 * @type {import('../../kiwiirc/src/libs/state/BufferState').default}
                 */
                const buf = this.buffer;
                /**
                 * @type {import('../../kiwiirc/src/libs/state/NetworkState').default}
                 */
                const net = this.network;
                await Promise.all(Object.values(buf.users).map(
                    /**
                     * 
                     * @param {import('../../kiwiirc/src/libs/state/UserState').default} u 
                     */
                    async u => {
                        if (u.nick === net.nick) return;
                        /**
                         * @todo check if user modes
                         */
                        const cnx = await connect(u, buf, net);
                        await negotiate(cnx, u, net);

                    }
                ));
                this.$state.callState = 'joined';
            }
        }
    });
    function removeNulls(o) {
        return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, [null, undefined].includes(v) ? '' : v]));
    }
    const CONNECTED_STATES = ['connected', 'connecting'];
    /**
     * 
     * @param {RTCPeerConnection} cnx
      * @param {import('../../kiwiirc/src/libs/state/UserState').default} u 
    * @param {import('../../kiwiirc/src/libs/state/NetworkState').default} net
     */
    async function negotiate(cnx, u, net) {
        const offer = await cnx.createOffer();
        net.ircClient.tagmsg(u.nick, removeNulls({
            "+draft/command": 'OFFER',
            '+draft/sdp': offer?.sdp
        }));
        await cnx.setLocalDescription(offer);
    }
    /**
     * 
     * @param {import('../../kiwiirc/src/libs/state/UserState').default} u 
    * @param {import('../../kiwiirc/src/libs/state/BufferState').default} buf
    * @param {import('../../kiwiirc/src/libs/state/NetworkState').default} net
     * 
     */
    async function connect(u, buf, net) {

        kiwi.state.peers ??= {};
        kiwi.state.peers[u.id] ??= mkPeer();
        const peer = kiwi.state.peers[u.id];
        if (peer.connection) return peer.connection;
        peer.connection = new RTCPeerConnection();
        /**
         * @type {RTCPeerConnection}
         */
        const cnx = peer.connection;
        cnx.onicecandidate = e => {
            log.debug("Ice candidate...", e);
            net.ircClient.tagmsg(
                u.nick,
                removeNulls({
                    '+draft/command': "ICE_CANDIDATE",
                    '+draft/candidate': e?.candidate?.candidate,
                    '+draft/sdpmid': e?.candidate?.sdpMid,
                    '+draft/sdpmlineindex': e?.candidate?.sdpMLineIndex,
                })
            );
        };
        cnx.ontrack = e => {
            log.debug("got a track", e);
            peer.streams = e.streams
            updateConference();
            peer?.ontrack?.(e);
        }
        cnx.addEventListener('connectionstatechange', async e => {
            peer.connected = CONNECTED_STATES.includes(cnx.connectionState);
            if (cnx.connectionState === 'failed') {
                await cnx.restartIce();
            }
        });
        // cnx.addEventListener('negotiationneeded', async e => {
        //     await negotiate(cnx, u, net);
        // })
        cnx.addEventListener('iceconnectionstatechange', async e => {

            while (cnx.iceConnectionState === 'disconnected') {
                await new Promise(resolve => setTimeout(resolve, 10000));
                if (cnx.remoteDescription.type === 'answer') {
                    await cnx.setLocalDescription();
                    await cnx.setRemoteDescription(cnx.remoteDescription);
                } else {
                    await cnx.setRemoteDescription(cnx.remoteDescription);
                    await cnx.setLocalDescription();
                }
            }
        })
        kiwi.state.localStream.getTracks().forEach(t => {
            cnx.addTrack(t, kiwi.state.localStream);
            updateConference();
        });

        return cnx;
    }
    function updateConference() {
        kiwi.state.$emit('conference-lite.update');

    }
    function mkPeer() {
        return {
            _connected: false,
            get connected() {
                return this._connected;
            },
            set connected(v) {
                this._connected = v;
                updateConference();
                log.debug("connected?", this)
                return this._connected;
            }
        }
    }
    const CTCP_EVENTS = ['ctcp response', 'ctcp request']
    kiwi.on('start', async () => {
        /**
            * 
            * @type { import('../../kiwiirc/src/libs/state/NetworkState').default}
            */
        const network = kiwi.state.getActiveNetwork();
        network.ircClient.use(
            /**
                * 
                * @param {import('irc-framework/src/client')} client 
                * @param {import('middleware-handler')} raw 
                * @param {import('middleware-handler')} parsed 
                */
            (client, raw, parsed) => {
                parsed.use(async (event_name, event, client, next) => {
                    if (event_name.toUpperCase() === 'TAGMSG' && event.target === network.nick) {
                        const buf = network.bufferByName(event.nick) || kiwi.state.addBuffer(network.id, event.nick);
                        const user = network.users[event.nick.toUpperCase()];
                        const type = event.tags["+draft/command"];
                        log.debug("CTCP", event_name, event.type, buf.name, user, event);
                        if (!user) return next();
                        log.debug('processing ctcp...');
                        const sdp = event.tags["+draft/sdp"];
                        kiwi.state.peers ??= {};
                        kiwi.state.peers[user.id] ??= mkPeer();
                        const peer = kiwi.state.peers[user.id];
                        switch (type) {
                            case 'OFFER': {

                                peer.answer = async function () {
                                    log.debug("answering");
                                    const cnx = await connect(user, buf, network);
                                    await cnx.setRemoteDescription({ type: 'offer', sdp });
                                    const answer = await cnx.createAnswer();
                                    network.ircClient.tagmsg(event.nick, removeNulls({
                                        "+draft/command": "ANSWER",
                                        '+draft/sdp': answer.sdp
                                    }));
                                    await cnx.setLocalDescription(answer);
                                    peer.connected = true;

                                }
                                await peer.answer();
                                break;
                            }
                            case 'ANSWER': {
                                // alert('answering');
                                const cnx = peer.connection;
                                log.debug("cnx", cnx);
                                if (cnx) {
                                    await cnx.setRemoteDescription({
                                        type: 'answer',
                                        sdp
                                    });
                                    log.debug('remote desc set', sdp);
                                    peer.connected = true;
                                }
                                else {
                                    log.error("Received an answer for non existent call:", { event, user, peers: kiwi.state.peers })
                                }
                                break;
                            }
                            case 'ICE_CANDIDATE': {
                                const cnx = peer.connection;
                                if (cnx) {
                                    const candidate = {
                                        candidate: event.tags['+draft/candidate'],
                                        sdpMid: event.tags['+draft/sdpmid'],
                                        sdpMLineIndex: event.tags['+draft/sdpmlineindex'],
                                    }
                                    log.debug("Adding ice candidate", candidate);
                                    await cnx.addIceCandidate(candidate.candidate ? candidate : null);
                                }
                                break;
                            }
                        }
                    }
                    next();
                });
            }
        )
    })
});