const IrcMessage = require('irc-framework/src/ircmessage');

kiwi.plugin('conference-lite', async function (kiwi, log) {
    const {
        faPhone
    } = await import('@fortawesome/free-solid-svg-icons/faPhone')
    kiwi.svgIcons.library.add(faPhone)
    kiwi.addUi('header_channel', {
        template: `<div ref="root">
            <a @click="joinCall" title="Conference Call">
                <svg-icon icon="phone" class="tooltip-trigger"/>
                <span class="tooltip">Conference Call</span>
            </a>
            <div class="vid-container">
                <video v-if="localStream" ref="local" playsinline autoplay muted />
                <video autoplay playsinline :data-user-id="id" v-for="(peer, id) in peers">
            </div>
            </video>
        </div>
        `,
        props: ['buffer', 'network', 'sidebarState'],
        computed: {
            localStream() {
                const ret = this.$state.localStream;
                if (ret) {
                    this.$nextTick(() => {
                        this.$refs.local.srcObject = ret;
                    })
                }
                return ret;
            },
            peers() {
                this.$state.peers ??= {};
                return this.$state.peers;
            }
        },
        methods: {
            attach(user) {
                log.debug("Refs:", this.$refs);
                const vidEl = document.body.querySelector(`[data-user-id="${user.id}"]`);
                if (!vidEl) return setTimeout(() => this.attach(user), 1000);
                const [stream] = this.peers[user.id].streams;
                if (!stream) return log.error("No stream for user:", { user, peer: this.peers[user.id] });
                log.debug("Connecting video...", user, vidEl);
                alert('connecting vid..');
                vidEl.srcObject = stream;
            },
            async joinCall() {
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
                        this.peers[u.id].ontrack = () => {
                            this.$nextTick(() => {

                                this.attach(u);
                            });
                        }
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
        kiwi.state.peers[u.id] ??= {};
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
            kiwi.state.peers[u.id]?.ontrack?.(e);
        }
        kiwi.state.localStream.getTracks().forEach(t => {
            log.debug('adding track', t);
            local.addTrack(t, kiwi.state.localStream)
        });
        return local;
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
                        switch (event.type) {
                            case 'OFFER': {
                                kiwi.state.peers[user.id] ??= {

                                };
                                kiwi.state.peers[user.id].connected = false;
                                kiwi.state.peers[user.id].answer = async function () {
                                    kiwi.state.peers[user.id].connected = true;
                                    const local = await connect(user, buf, network);
                                    await local.setRemoteDescription({ type: 'offer', sdp });
                                    const answer = await local.createAnswer();
                                    const msg = ctcp('respond', event.nick, 'ANSWER', {
                                        '+draft/sdp': answer.sdp
                                    });
                                    network.ircClient.raw(msg.to1459());
                                    await local.setLocalDescription(answer);
                                }

                                break;
                            }
                            case 'ANSWER': {
                                const local = kiwi.state.peers[user.id].connection;
                                if (local) await local.setRemoteDescription({
                                    type: 'answer',
                                    sdp
                                });
                                else {
                                    log.error("Received an answer for non existent call:", { event, user, peers: kiwi.state.peers })
                                }
                                break;
                            }
                            case 'ICE_CANDIDATE': {
                                const local = kiwi.state.peers[user.id].connection;
                                if (local) {
                                    const candidate = {
                                        candidate: event.tags['+draft/candidate'],
                                        sdpMid: event.tags['+draft/sdpmid'],
                                        sdpMLineIndex: event.tags['+draft/sdpmlineindex'],
                                    }
                                    log.debug("Adding ice candidate", candidate);
                                    await local.addIceCandidate(candidate.candidate ? candidate : null);
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