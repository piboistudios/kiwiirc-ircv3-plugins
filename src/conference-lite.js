const IrcMessage = require('irc-framework/src/ircmessage');
const lodash = require('lodash');
kiwi.plugin('conference-lite', async function (kiwi, log) {
    const {
        faPhone,
    } = await import('@fortawesome/free-solid-svg-icons/faPhone')
    const {
        faVideoSlash
    } = await import('@fortawesome/free-solid-svg-icons/faVideoSlash')
    const {
        faVideo
    } = await import('@fortawesome/free-solid-svg-icons/faVideo')
    const {
        faMicrophoneSlash
    } = await import('@fortawesome/free-solid-svg-icons/faMicrophoneSlash')
    const {
        faMicrophone
    } = await import('@fortawesome/free-solid-svg-icons/faMicrophone')
    const {
        faThumbtackSlash
    } = await import('@fortawesome/free-solid-svg-icons/faThumbtackSlash')
    const {
        faThumbtack
    } = await import('@fortawesome/free-solid-svg-icons/faThumbtack')
    const {
        faCameraRotate
    } = await import('@fortawesome/free-solid-svg-icons/faCameraRotate')
    const {
        faPersonChalkboard
    } = await import('@fortawesome/free-solid-svg-icons/faPersonChalkboard')
    kiwi.svgIcons.library.add(
        faPhone,
        faVideo,
        faVideoSlash,
        faMicrophone,
        faMicrophoneSlash,
        faThumbtack,
        faThumbtackSlash,
        faCameraRotate,
        faPersonChalkboard
    );
    const controlBtn = {
        props: {
            title: String,
            icon: String,
            color: {
                default: "unset",
                type: String
            },
            textClass: String,
            iconProps: {
                default: () => { },
                type: Object
            }
        },
        emits: ['click'],
        template: `
                <span @click="$emit('click')" class="kiwi-header-option">
                    <a :title="title" :class="textClass" :style="'color:'+color">
                        <svg-icon :icon="icon" v-bind="iconProps" />
                    </a>
                </span>
        `
    }
    const audioVisualization = {
        props: {
            analyser: AnalyserNode,
            width: {
                default: 48,
                type: Number
            },
            height: {
                default: 48,
                type: Number
            },
            barWidth: {
                default: 2,
                type: Number
            },
            barPadding: {
                default: 1,
                type: Number
            },
            amplitude: {
                default: 1,
                type: Number
            }
        },
        template: `<canvas ref="canvas" :width="width" :height="height" />`,
        data() {
            return {
                frame: null,
                buffer: null
            }
        },
        watch: {
            width() {
                this.$nextTick(this.setData);
            },
            barWidth() {
                this.$nextTick(this.setData);
            }
        },
        methods: {
            setData() {
                const bufLen = this.width / (this.barWidth + this.barPadding);
                log.debug("Buffer length?", bufLen);
                this.buffer = new Uint8Array(bufLen);
            }
        },
        mounted() {
            this.setData();

            /**
             * @type {HTMLCanvasElement}
             */
            const canvas = this.$refs.canvas;
            const ctx = canvas.getContext('2d');
            const vars = getComputedStyle(document.body);
            let bg = vars.getPropertyValue("--brand-primary");
            let fg = vars.getPropertyValue("--brand-notice");
            this.$state.on('theme.change', () => {
                const vars = getComputedStyle(document.body);
                bg = vars.getPropertyValue("--brand-primary");
                fg = vars.getPropertyValue("--brand-notice");
            });
            const draw = () => {
                this.frame = requestAnimationFrame(draw);
                /**
               * @type {AnalyserNode}
               */
                const analyser = this.analyser;
                analyser.fftSize = 256;

                const W = this.width;
                const H = this.height;
                const b = this.barWidth;
                const p = this.barPadding;
                const a = this.amplitude;
                ctx.clearRect(0, 0, W, H);

                analyser.getByteTimeDomainData(this.buffer);
                ctx.fillStyle = bg;
                ctx.beginPath();
                ctx.ellipse(W / 2, H / 2, W / 3, H / 3, 0, 0, 2 * Math.PI);
                ctx.fill();
                ctx.fillStyle = fg;
                for (let i = 0; i < this.buffer.length; i++) {
                    const h = this.buffer[i] / 256.0;
                    const d = Math.max(Math.min((h - 0.5) * a, 1), -1);
                    ctx.beginPath();
                    ctx.roundRect((i + 0.5) * (b + p), (H / 2) - ((d * H) / 2), b, d * H, [2]);
                    ctx.fill();

                }
            };
            draw();
        }
    }
    const media = {
        props: ['buffer', 'network', 'sidebarState'],
        components: { controlBtn },
        computed: {
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
            },
            feeds() {
                this.state;
                const entries = Object.entries(this.connectedPeers);
                this.$state.localStreams ??= [];
                entries.unshift([this.network.currentUser().id, {
                    local: true,
                    connection: null,
                    streams: [this.$state.localStream, ...this.$state.localStreams].filter(Boolean)
                }])
                const ret = entries
                    .flatMap(([id, cnx]) => (cnx?.streams || []).filter(s => s.active).map(stream => ({ ...cnx, id, stream })))
                    .sort((a, b) => {
                        let _a = a.stream.id === this.$state.pinned ? -1 : 0;
                        let _b = b.stream.id === this.$state.pinned ? -1 : 0;
                        return _a - _b;
                    })
                log.debug("feeds?", ret);
                log.debug("entries?", entries);
                return ret;

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
    const UserAvatar = kiwi.require('components/UserAvatar');
    const peer = {
        props: ['feed', 'pinned'],
        emits: ['togglePin',],
        components: { UserAvatar, AudioVisualization: audioVisualization },
        template: `
            <div class="peer">
                <div class="video-controls" :key="state">
                    <control-btn @click="toggleVideo" 
                        :title="videoEnabled ? 'Turn Off Camera' : 'Turn On Camera'" 
                        :icon="videoEnabled ? 'video' : 'video-slash'"
                    />
                    <control-btn @click="toggleAudio" 
                        :title="muted ? 'Unmute' : 'Mute'" 
                        :icon="!muted ? 'microphone' : 'microphone-slash'"
                    />
                    <control-btn @click="togglePin"
                        :title="pinned ? 'Unpin' : 'Pin'"
                        :icon="pinned ? 'thumbtack' : 'thumbtack-slash'"
                    />
                    <control-btn v-if="canFlipCam" 
                        @click="flipCameraView"
                        title="Flip Camera"
                        icon="camera-rotate"
                    />
                </div>
                <div class="vid-container">
                    <video 
                        ref="cam"
                        :key="isMe"
                        class="cam"
                        autoplay
                        playsinline
                        :data-muted="isMe"
                        :muted="isMe" 
                        :data-user-id="feed.id"
                    >
                        <h1 class="u-link">Video element not supported in this browser</h1>
                    </video>
                    <div
                        class="live-vid fallback"
                        v-show="!videoEnabled"
                        ref="fallback"
                    >
                        <div class="kiwi-userbox-avatar">
                            <user-avatar
                                :network="network"
                                :user="user"
                                size="large"
                            />
                        </div>
                    </div>
                    <canvas
                        v-show="videoEnabled"
                        ref="vid"
                        class="live-vid"
                        :data-user-id="feed.id"
                        :data-nick="user.nick"
                    />
                        <div class="video-info">
                            <audio-visualization
                                v-if="audio.analyser"
                                :analyser="audio.analyser"
                                :bar-width="8"
                                :bar-padding="2"
                                :amplitude="16"
                            />
                        </div>
                </div>
            </div>
        `,
        mounted() {
            log.debug("peer vm:", this);
            this.$state.$on('conference-lite.update', () => {
                this.update();
            });
            this.feed && log.debug("feed?", this.feed);
            this.$nextTick(() => {
                this.attachStream();
                this.setup();
            });
            if (!this.isMe) {
                this.$state.peers[this.user.id].refresh ??= []
                this.$state.peers[this.user.id].refresh.push(() => this.$nextTick(this.update.bind(this)));
            }
            this.$state.audioContext ??= new AudioContext();
            if (!this.feed.stream.getAudioTracks().length) return;
            this.audio.source = this.$state.audioContext.createMediaStreamSource(this.feed.stream);
            this.audio.analyser = this.$state.audioContext.createAnalyser();
            this.audio.source.connect(this.audio.analyser);


        },
        onBeforeUnmount() {

            this.teardown();
        },
        computed: {

            user() {
                this.state;
                return this.feed.id !== undefined && Object.values(this.network.users).find(u => u.id == this.feed.id);
            },
            videoEnabled() {
                this.state;
                return Boolean(this?.feed?.stream?.getVideoTracks?.()?.filter?.(v => v.enabled && !v.muted)?.length);
            },
            audioEnabled() {
                this.state;
                return Boolean(this?.feed?.stream?.getAudioTracks?.()?.filter?.(v => v.enabled && !v.muted)?.length);
            },
            muted() {
                return !this.audioEnabled;
            },
            isMe() {
                this.state;
                return this.feed.id === this.network.currentUser().id;
            },
            canFlipCam() {
                /**
                 * @todo make this actually work :)
                 */
                // return false;
                if (!this.isMe) return false;
                return this?.feed?.stream?.id && this.feed.stream.id === this.feed.streams[0].id;
            }
        },
        mixins: [media],
        watch: {
            pinned(n, o) {
                if (n) {
                    this.settings.videoSize.width = "auto";
                    this.settings.videoSize.height = "auto";
                } else {
                    this.settings.videoSize = { ...this.defaults.videoSize };
                }
            }
        },
        methods: {
            setup() {
                /**
                 * @type {HTMLCanvasElement}
                 */
                const canvas = this.$refs.vid;
                /**
                 * @type {HTMLVideoElement}
                 */
                const cam = this.$refs.cam;
                const ctx = canvas.getContext('2d');
                this.screen = cam.getBoundingClientRect();
                const isMe = this.isMe;
                const draw = async () => {
                    this.frame = requestAnimationFrame(draw);
                    const W = cam.videoWidth;
                    const H = cam.videoHeight;
                    const rect = cam.getBoundingClientRect();
                    if (rect) {
                        if (rect.height) canvas.height = rect.height;
                        if (rect.width) canvas.width = rect.width;
                        // canvas.style.width = `${this.settings.videoSize.width}`;
                        canvas.style.height = `${this.settings.videoSize.height}`;
                        const fallback = this.$refs.fallback;
                        if (fallback) fallback.style.height = canvas.style.height;
                    }
                    const dx = canvas.width - W;
                    const dy = canvas.height - H;
                    ctx.drawImage(cam, dx / 2, dy / 2, W, H);
                    if (isMe) {

                        ctx.fillStyle = 'red';
                        ctx.beginPath()
                        ctx.rect(W / 2, H / 2, W / 4, H / 4);
                        ctx.fill();
                        ctx.strokeStyle = 'yellow';
                        ctx.font = '50px Ubuntu';
                        ctx.lineWidth = 4;
                        ctx.beginPath();
                        ctx.strokeText(this.user.nick, W / 2, H / 2);
                        ctx.stroke()
                        ctx.closePath();
                        ctx.fill()
                    }
                }
                draw();
                this.$nextTick(this.resizeScreen);
                if (!this.isMe) return;
                this.videoOutput = canvas.captureStream();
                this.setupTracks();




            },
            setupTracks() {
                this.$state.tracks ??= [];
                this.$state.outputFeed ??= {}
                this.feed.stream.label && this.removeTracks(this.feed.stream.label);
                /**
                 * @type {MediaStream}
                 */
                const stream = new MediaStream();
                // replace video track with video output
                this.feed.stream.getAudioTracks().forEach(t => stream.addTrack(t));
                this.videoOutput.getVideoTracks().forEach(t => stream.addTrack(t));
                const tracks = this.$state.tracks || [];
                tracks.push(...stream.getTracks().map(t => ({ stream, track: t, })));
                updateTracks();
                // replace output feed
                // const idx = this.$state.localStreams.indexOf(this.outputFeed);
                // if (idx !== -1) this.$state.localStreams[idx] = stream;
                // else this.$state.localStreams.push(stream);
                if (this.feed.stream.label) this.$state.outputFeed[this.feed.stream.label] = stream;
                this.$state.beginLocalStream();
            },
            removeTracks(label) {
                const tracksToRemove = this.$state.tracks.filter(({ stream, track }) => stream === this.$state.outputFeed[label]);
                tracksToRemove.forEach((i) => this.$state.tracks.splice(this.$state.tracks.indexOf(i), 1));
                removeTracks(tracksToRemove);
            },
            teardown() {
                cancelAnimationFrame(this.frame);
                if (!this.isMe) return;
                log.debug("teardown");
                this.videoOutput.getTracks().forEach(t => {
                    t.stop();
                });
                this.removeTracks();
                if (this.$state.localStream === this.feed.stream) this.$state.localStream = null;
            },
            async flipCameraView(attempt = 0) {
                if (this.flippingCam) return;
                // if (attempt > this.maxAttempts.flipCam) return;
                this.flippingCam = true;
                const originalFacing = this.$state.mediaConstraints.video.facingMode;
                try {


                    this.$state.mediaConstraints.video.facingMode = originalFacing === 'user' ? 'environment' : 'user';
                    const removals = [];
                    /**
                     * @type {MediaStream}
                     */
                    // this.$state.localStream.getTracks().forEach(t => {
                    //     t.stop();
                    // });
                    // this.removeTracks();
                    // this.setStream(null);
                    // this.audio.source.disconnect();
                    // await new Promise((resolve, reject) => {
                    //     const check = () => {
                    //         const allStopped = this.$state.localStream.getTracks().every(t => {
                    //             const r = t.readyState === 'ended'
                    //             !r && t.stop();
                    //             return r;
                    //         });
                    //         allStopped && resolve();
                    //         !allStopped && this.$nextTick(check);
                    //     }
                    //     check();
                    // });
                    await this.$state.endMediaStream();
                    const stream = await getUserMedia();
                    this.$state.localStream = stream;
                    this.$state.emit('conference-lite.update');
                    // alert(`it took ${attempt} attempts to flip cam :)`)
                } catch (e) {
                    log.error("Failed to flip camera:", e, e.stack);
                    // alert(e.toString());
                    // this.$state.addMessage(this.buffer, {
                    //     message: e.toString()
                    // })
                    this.$state.mediaConstraints.video.facingMode = originalFacing;
                    setTimeout(() => this.flipCameraView(++attempt));
                } finally {
                    this.flippingCam = false;
                }
                // });
            },
            togglePin() {
                this.$emit('togglePin');
                this.update();

            },
            toggleVideo() {
                this?.feed.stream
                    ?.getVideoTracks?.()
                    ?.filter(Boolean)?.forEach?.(v => { v.enabled = !v.enabled });
                this.update();
            },
            toggleAudio() {
                this?.feed?.stream
                    ?.getAudioTracks?.()
                    ?.filter(Boolean)?.forEach?.(v => { v.enabled = !v.enabled });
                this.update();
            },
            resizeScreen() {
                if (true || !this.videoEnabled) return;
                /**
             * @type {HTMLVideoElement}
             */
                const vid = this.$refs?.cam;
                if (!vid) return;
                const viewer = document.querySelector(
                    '.kiwi-mediaviewer.kiwi-main-mediaviewer .kiwi-mediaviewer-content'
                );
                const width = viewer.getBoundingClientRect().width * 0.9;
                const screenWidth = window.innerWidth;
                if (!this.pinned)
                    vid.width = Math.max(
                        width /
                        Math.max(
                            Math.min(
                                Object.keys(this.connectedPeers).length + 1, 8),
                            2),
                        screenWidth / 4
                    );
                else vid.width = screenWidth * 0.9;
                if (this.$refs.fallback) {
                    this.$refs.fallback.style.width = Math.max(vid.width, screenWidth / 4) + 'px';
                    this.$refs.fallback.style.height = Math.max(rect.height, screenWidth / 4) + 'px';
                }

                this.screen = rect;
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
            /**
             * 
             * @param {MediaStream} stream 
             */
            setStream(stream) {
                this.$refs.cam.srcObject = stream;
            },
            attachStream() {
                if (this.attempts.stream >= this.maxAttempts.stream) return;
                this.attempts.stream++;
                if (!this.$refs.vid) return this.$nextTick(this.attachStream);
                if (!this.feed.stream) return setTimeout(this.attachStream, 100);
                this.setStream(this.feed.stream);
            },

        },
        data() {
            return {
                flippingCam: false,
                settings: {
                    videoSize: {
                        height: '256px',
                        width: '256px'
                    }
                },
                defaults: {
                    videoSize: {
                        height: '256px',
                        width: '256px'
                    }
                },
                screen: null,
                videoOutput: null,
                outputFeed: null,
                senders: [],
                frame: null,
                audio: {
                    source: null,
                    analyser: null,

                },
                attempts: {
                    stream: 0,
                },
                maxAttempts: {
                    stream: 32,
                    flipCam: 256
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
            },
            togglePin(id) {
                if (this.$state.pinned === id) {
                    this.$state.pinned = null;
                    return this.update();
                }
                this.$state.pinned = id;
                this.update();
            },
            async screenShare() {
                let stream;
                try {
                    stream = await navigator.mediaDevices.getDisplayMedia();
                } catch (e) {
                    log.error("Failed to get display stream:", e);
                }
                if (stream) {
                    stream.label = "screenshare";
                    this.$state.localStreams.push(stream);
                }
                updateTracks();
                this.update();
            },
        },
        computed: {
            pinned() {
                this.state;
                return this.$state.pinned;
            }
        },
        data() {
            return {
            }
        },
        mounted() {
            this.$state.$on('conference-lite.update', this.update);
        },
        template: `
        <div :class={fullscreen} class="conference conference-container" v-resizeobserver="resize">
            <div class="conference">
                <peer
                    v-for="feed in feeds" 
                    :key="feed.stream.id"
                    :component="peer" 
                    v-bind="{ network, buffer, feed }"
                    :pinned="pinned===feed.stream.id"
                    @toggle-pin="() => togglePin(feed.stream.id)"
                />
                <div class="conference-controls">
                    <div class="conference-controlbar">
                        <control-btn
                            @click="hangup"
                            icon="phone"
                            title="Leave Call"
                            text-class="u-button-warning"
                            :icon-props="{transform: {rotate: 135}}"
                        />  
                        
                        <control-btn
                            @click="screenShare"
                            icon="gear"
                            title="Screen Share"
                            text-class="u-button-primary"
                        />  
                    </div>
                </div>
            </div>
        </div>`,

    }
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
                fullscreen: false
            }
        },
        methods: {

            async joinCall() {

                kiwi.state.localStreamReady ??= new Promise((resolve, reject) => {
                    kiwi.state.beginLocalStream = resolve;
                    kiwi.state.cancelLocalStream = reject;
                });
                this.$state.emit('mediaviewer.show', {
                    component: conference,
                    componentProps: {
                        pluginState: this.pluginState,
                        sidebarState: this.sidebarState,
                        network: this.network,
                        buffer: this.buffer,
                    }
                });
                await ensureLocalStream();
                updateConference();

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
                document.addEventListener("visibilitychange", function () {
                    setTimeout(() => {

                        net.ircClient.tagmsg(buf.name, {
                            "+draft/command": "REFRESH"
                        });
                    }, 2000);
                }, false);
                await Promise.all(Object.values(buf.users).map(
                    /**
                     * 
                     * @param {import('../../kiwiirc/src/libs/state/UserState').default} u 
                     */
                    async u => {
                        log.debug("connecting to...", u);

                        if (u.nick === net.nick || this.$state.peers[u.id]) return;
                        /**
                         * @todo check if user modes
                         */
                        const cnx = await connect(u, buf, net);
                        await negotiate(cnx, u, net);
                        log.debug("connected..?");

                    }
                ));
                this.$state.callState = 'joined';
                updateConference();

            }
        }
    });
    async function ensureLocalStream() {
        kiwi.state.localStream ??= await getUserMedia();
        kiwi.state.localStreams ??= [];

    }
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
        // alert('negotiating');
        if (cnx.signalingState === 'have-remote-offer') return;
        const offer = await cnx.createOffer();
        net.ircClient.tagmsg(u.nick, removeNulls({
            "+draft/command": 'OFFER',
            '+draft/sdp': offer?.sdp
        }));
        await cnx.setLocalDescription(offer);
    }
    /**
     * 
     * @param {MediaStreamTrack[]} tracksToRemove 
     */
    function removeTracks(tracksToRemove) {
        const peers = Object.values(kiwi.state.peers).filter(p => p.connection);
        tracksToRemove.forEach((t) => peers.forEach(peer => {
            const { track, stream } = t;
            log.debug("removing track", track, "for", peer);
            /**
             * @type {RTCPeerConnection\}
             */
            const connection = peer.connection;
            const sender = connection.getSenders().find(s => s.track && s.track.id === track.id);
            log.debug("sender?", sender);
            if (sender) {
                connection.removeTrack(sender);
            }
        }));
    }
    function updateTracks() {
        Object.values(kiwi.state.peers).forEach(p => setTracks(p));
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
            peer.streams ??= [];
            peer.streams.push(...e.streams.filter(s => !peer.streams.find(s2 => s2.id === s.id)));
            updateConference();
            peer?.ontrack?.(e);
        }
        cnx.addEventListener('connectionstatechange', async e => {
            peer.connected = CONNECTED_STATES.includes(cnx.connectionState);
            if (cnx.connectionState === 'failed') {
                await cnx.restartIce();
            }
            updateConference();

        });
        cnx.addEventListener('negotiationneeded', async e => {
            await negotiate(cnx, u, net);
        })
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
        });
        await kiwi.state.localStreamReady;
        // kiwi.state.tracks ??= [];

        updateConference();
        // kiwi.state.localStreams.forEach(s => s.getAudioTracks().forEach(t => kiwi.state.tracks.push({ stream: s, track: t })))
        setTracks(peer);
        return cnx;
    }
    /**
     * 
     * @param {{connection: RTCPeerConnection, tracks: RTCRtpSender[]}} peer
     */
    function setTracks(peer) {
        // peer.connection.getSenders().forEach(s => peer.connection.removeTrack(s));

        kiwi.state.tracks.forEach(({ track, stream }) => {
            log.debug("adding track", track);
            if (!peer.connection.getSenders().find(s => s.track && s.track.id === track.id)) peer.connection.addTrack(track, stream);
        });

    }
    async function getUserMedia() {
        /** @type {MediaTrackConstraints}*/
        kiwi.state.mediaConstraints ??= {
            audio: true,
            video: {
                facingMode:
                    'user'

            }
        };
        // alert(JSON.stringify(kiwi.state.mediaConstraints, null, 4))
        const s = await navigator.mediaDevices.getUserMedia(kiwi.state.mediaConstraints);
        kiwi.state.endMediaStream = async () => {
            const tracks = s.getTracks();
            while (!tracks.every(t => t.readyState === 'ended')) {
                tracks.forEach(t => t.stop());
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        };
        s.label = 'cam';
        return s;
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
    let network = kiwi.state.getActiveNetwork();
    !network && await new Promise((resolve, reject) => kiwi.on('start', async () => {
        resolve();
    }))
    /**
        * 
        * @type { import('../../kiwiirc/src/libs/state/NetworkState').default}
        */
    if (!network) network = kiwi.state.getActiveNetwork();
    network.ircClient.use(
        /**
            * 
            * @param {import('irc-framework/src/client')} client 
            * @param {import('middleware-handler')} raw 
            * @param {import('middleware-handler')} parsed 
            */
        (client, raw, parsed) => {

            parsed.use(async (event_name, event, client, next) => {
                log.debug('got event...?', event)
                if (event_name.toUpperCase() === 'TAGMSG') {
                    const ignore = event.target !== network.nick && event.tags["+draft/command"] !== "REFRESH";
                    if (ignore) return next();
                    const buf = network.bufferByName(event.nick) || kiwi.state.addBuffer(network.id, event.nick);
                    const user = network.users[event.nick.toUpperCase()];
                    const type = event.tags["+draft/command"];
                    log.debug("Peer TAGMSG", event_name, type, buf.name, user, event);
                    if (!user) return next();
                    log.debug('processing tagmsg...');
                    const sdp = event.tags["+draft/sdp"];
                    kiwi.state.peers ??= {};
                    kiwi.state.peers[user.id] ??= mkPeer();
                    const peer = kiwi.state.peers[user.id];
                    switch (type) {
                        case 'REFRESH': {
                            setTimeout(lodash.throttle(() => updateConference(), 1000), 2000);
                            return;
                        }
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
                            log.debug("got an offer? answering?");
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
});