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
                    return peer.connected;
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
            <video ref="vid" class="live-vid" autoplay playsinline :muted="muted" :data-user-id="peerId" />
        `,
        mounted() {
            log.debug("peer vm:", this);
            this.remote && log.debug("remote?", this.remote);
            this.$nextTick(() => {

                this.setMaxHeight('70vh');
                this.setMaxWidth('33vh');
                this.setHeight('512px');
                this.setWidth('512px')
                if (this.isMe) {
                    this.attachLocalStream();
                } else if (this.remote) {
                    this.attachRemoteStream();
                }
            });

        },
        methods: {
            setWidth(v) {
                if (!this.$refs.vid) return this.$nextTick(() => this.setWidth(v));
                this.$refs.vid.style.width = v;
            },
            setMaxWidth(v) {
                if (!this.$refs.vid) return this.$nextTick(() => this.setMaxWidth(v));
                this.$refs.vid.style.maxWidth = v;
            },
            setHeight() {
                return this.$parent.setHeight(...arguments);
            },
            setMaxHeight() {
                return this.$parent.setMaxHeight(...arguments);
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
        computed: {
            isMe() {
                return this.peerId === 0;
            },
            muted() {
                return this.isMe;
            }
        }
    };
    const conference = {
        mixins: [media],
        components: {
            MediaViewer,
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
                this.$parent.setHeight('1024px');
            });
        },
        template: `
        <div class="vid-container">
            <div class="me">
                <media-viewer 
                    
                    :component="peer" 
                    :component-props="{ network, buffer, peerId: 0 }" 
                />
            </div>
            <div class="peers" :key="state">
                <media-viewer
                    v-for="(remote, id) in connectedPeers" 
                    :component="peer" 
                    :component-props="{ network, buffer, peerId: id, remote }" 
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
                        const local = await connect(u, buf, net);
                        if (!(this.peers[u.id].answer instanceof Function)) {

                            const offer = await local.createOffer();
                            const msg = ctcp('request', u.nick, 'OFFER', {
                                '+draft/sdp': offer?.sdp
                            });
                            net.ircClient.raw(msg.to1459());
                            await local.setLocalDescription(offer);

                        }
                        else if (!this.peers[u.id].connected) {
                            await this.peers[u.id].answer();
                        }

                    }
                ));

            }
        }
    });
    const CTCP_TYPE_MAP = {
        'RESPOND': 'NOTICE',
        'REQUEST': 'PRIVMSG'
    }
    function ctcp(cmd, target, params, tags) {
        cmd = cmd.toUpperCase();
        if (!(params instanceof Array)) params = [params];
        const msg = new IrcMessage(
            CTCP_TYPE_MAP[cmd] || cmd,
            target,
            String.fromCharCode(1) + params.join(' ') + String.fromCharCode(1)
        );
        msg.tags = filter(tags);
        return msg;
    }
    function filter(o) {
        return Object.fromEntries(Object.entries(o).filter(e => e[1]));
    }
    /**
     * 
     * @param {import('../../kiwiirc/src/libs/state/UserState').default} u 
    * @param {import('../../kiwiirc/src/libs/state/BufferState').default} buf
    * @param {import('../../kiwiirc/src/libs/state/NetworkState').default} net
     * 
     */
    async function connect(u, buf, net) {
        kiwi.state.localStream ??= await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        const local = new RTCPeerConnection();
        kiwi.state.peers ??= {};
        kiwi.state.peers[u.id] ??= mkPeer();
        kiwi.state.peers[u.id].connection = local;
        local.onicecandidate = e => {
            log.debug("Ice candidate...", e);
            const msg = ctcp(
                'respond',
                u.nick,
                'ICE_CANDIDATE',
                {
                    '+draft/candidate': e?.candidate?.candidate,
                    '+draft/sdpmid': e?.candidate?.sdpMid,
                    '+draft/sdpmlineindex': e?.candidate?.sdpMLineIndex,
                }
            );
            net.ircClient.raw(msg.to1459());
        };
        local.ontrack = e => {
            log.debug("got a track", e);
            kiwi.state.peers[u.id].streams = e.streams
            updateConference();
            kiwi.state.peers[u.id]?.ontrack?.(e);
        }
        kiwi.state.localStream.getTracks().forEach(t => {
            local.addTrack(t, kiwi.state.localStream);
            updateConference();
        });

        return local;
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
                    if (CTCP_EVENTS.includes(event_name) && event.target === network.nick) {
                        const buf = network.bufferByName(event.nick) || kiwi.state.addBuffer(network.id, event.nick);
                        const user = network.users[event.nick.toUpperCase()];
                        log.debug("CTCP", event_name, event.type, buf.name, user, event);
                        if (!user) return next();
                        log.debug('processing ctcp...');
                        const sdp = event.tags["+draft/sdp"];
                        kiwi.state.peers ??= {};
                        kiwi.state.peers[user.id] ??= mkPeer();
                        const peer = kiwi.state.peers[user.id];
                        switch (event.type) {
                            case 'OFFER': {

                                peer.answer = async function () {
                                    log.debug("answering");
                                    const cnx = await connect(user, buf, network);
                                    await cnx.setRemoteDescription({ type: 'offer', sdp });
                                    const answer = await cnx.createAnswer();
                                    const msg = ctcp('respond', event.nick, 'ANSWER', {
                                        '+draft/sdp': answer.sdp
                                    });
                                    network.ircClient.raw(msg.to1459());
                                    await cnx.setLocalDescription(answer);
                                    peer.connected = true;

                                }

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