const IrcMessage = require('irc-framework/src/ircmessage');
/**
 * @type {import('panzoom').default}
 */
const Panzoom = require('panzoom');
const lodash = require('lodash');
const bodySegmentation = require('@tensorflow-models/body-segmentation')
const BREAKPOINT = 720;
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
    const {
        faImage
    } = await import('@fortawesome/free-solid-svg-icons/faImage')
    const {
        faMessage
    } = await import('@fortawesome/free-solid-svg-icons/faMessage')
    const {
        faComment
    } = await import('@fortawesome/free-solid-svg-icons/faComment')
    const {
        faCommentSlash
    } = await import('@fortawesome/free-solid-svg-icons/faCommentSlash')
    const {
        faEllipsis
    } = await import('@fortawesome/free-solid-svg-icons/faEllipsis')
    const {
        faEllipsisVertical
    } = await import('@fortawesome/free-solid-svg-icons/faEllipsisVertical')
    const {
        faMagnifyingGlass
    } = await import('@fortawesome/free-solid-svg-icons/faMagnifyingGlass')
    kiwi.svgIcons.library.add(
        faPhone,
        faVideo,
        faVideoSlash,
        faMicrophone,
        faMicrophoneSlash,
        faThumbtack,
        faThumbtackSlash,
        faCameraRotate,
        faPersonChalkboard,
        faImage,
        faMessage,
        faComment,
        faCommentSlash,
        faEllipsis,
        faEllipsisVertical,
        faMagnifyingGlass
    );
    kiwi.state.isMobile = (function () {
        let check = false;
        (function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || navigator.vendor || window.opera);
        return check;
    })();

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
                <span @click="e => $emit('click', e)" class="kiwi-header-option control control-btn">
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
                buffer: null,
                draw: null
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
                if (!this) return;
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
            this.draw = draw;
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
                    return peer?.connection?.connectionState === 'connected';
                }));
            },
            connectingPeers() {
                this.state;
                return Object.fromEntries(Object.entries(this.peers).filter(([_, peer]) => {
                    log.debug("filtering peers?", "k", _, "v", peer);
                    log.debug("connected?", peer.connected);
                    return peer?.connection?.connectionState === 'connecting';
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
                log.debug("feeds?", ret);
                log.debug("entries?", entries);
                return ret;

            }
        },
        methods: {
            update() {
                this.state = (this.state + 1) % 1024;
                log.debug("Updating:", this.state);
                this.onUpdate instanceof Function && this.onUpdate();
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
        props: ['feed', 'pinned', 'cellWidth', 'colSpan', 'gridTemplateColumns', 'visible'],
        emits: ['togglePin',],
        components: { UserAvatar, AudioVisualization: audioVisualization },
        template: `
            <div class="peer"  :class="{pinned}" :data-user-id="feed.id" :data-stream-id="feed.stream.id">
                <div class="vid-container" ref="container">
                     <div class="video-controls"  :key="state">
                        <div class="video-info">
                                <audio-visualization
                                    ref="audioOutput"
                                    v-if="audio.analyser"
                                    :analyser="audio.analyser"
                                    :bar-width="8"
                                    :bar-padding="2"
                                    :amplitude="16"
                                />
                        </div>
                        <div ref="controls" class="control control-container":class="{mobile: $state.isMobile, 'controls-open': forceShowControls}">
                             <control-btn
                                v-show="$state.isMobile"
                                title="Settings" 
                                icon="ellipsis"
                                @click="toggleControls"
                            />
                            <control-btn @click="toggleVideo" 
                                v-show="showControls"
                                :title="videoEnabled ? 'Turn Off Camera' : 'Turn On Camera'" 
                                :icon="videoEnabled ? 'video' : 'video-slash'"
                            />
                            <control-btn @click="toggleAudio" 
                                v-show="showControls"
                                :title="muted ? 'Unmute' : 'Mute'" 
                                :icon="!muted ? 'microphone' : 'microphone-slash'"
                            />
                            <control-btn @click="togglePin"
                                v-show="showControls"
                                :title="pinned ? 'Unpin' : 'Pin'"
                                :icon="pinned ? 'thumbtack' : 'thumbtack-slash'"
                            />
                            <control-btn v-if="canFlipCam" 
                                v-show="showControls"
                                @click="flipCameraView"
                                title="Flip Camera"
                                icon="camera-rotate"
                            />
                           
                        </div>
                    </div>
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
                        class="fallback"
                        v-show="!videoEnabled"
                        ref="fallback"
                    >
                        <div ref="volumeIndicator" class="kiwi-userbox-avatar volume-indicator" style="
                            opacity: 0;
                            transform: scale(0);
                        ">
                            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="kiwi-avatar">
                                <circle r="40" cx="50" cy="50" class="conference-volume-indicator"><!--v-if--></circle>
                            </svg>
                        </div>
                        <div class="kiwi-userbox-avatar" :class="{mobile: $state.isMobile}">
                            <user-avatar
                                :network="network"
                                :user="user"
                                size="large"
                            />
                        </div>
                    </div>
                    <canvas
                        :class="{visible: videoEnabled}"
                        ref="vid"
                        
                        class="live-vid"
                        :data-user-id="feed.id"
                        :data-nick="user.nick"
                    />
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
                this.onUpdate();
            });
            /**
             * @type {MediaStream}
             */
            // const stream = this.feed.stream
            // stream.getTracks()
            //     .forEach(t => {
            //         t.onmute = e => (t.kind === 'video' ? setVideo : setAudio)({ stream, target: this.buffer, net: this.network }, false);
            //         t.onunmute = e => (t.kind === 'video' ? setVideo : setAudio)({ stream, target: this.buffer, net: this.network }, true);
            //     });

            if (!this.isMe) {
                this.$state.peers[this.user.id].refresh ??= []
                this.$state.peers[this.user.id].refresh.push(() => this.$nextTick(this.update.bind(this)));
            }
            this.$state.audioContext ??= new AudioContext();
            if (!this.feed.stream.getAudioTracks().length) return;
            this.audio.source = this.$state.audioContext.createMediaStreamSource(this.feed.stream);
            this.audio.analyser = this.$state.audioContext.createAnalyser();
            this.audio.source.connect(this.audio.analyser);
            this.setupTranscription();



        },
        onBeforeUnmount() {

            this.teardown();
        },
        computed: {
            showControls() {
                return !this.$state.isMobile || this.forceShowControls;
            },

            networkStream() {
                return this.feed.stream.network_label && this.$state.outputFeeds[this.feed.stream.network_label];
            },
            user() {
                this.state;
                return this.feed.id !== undefined && Object.values(this.network.users).find(u => u.id == this.feed.id);
            },
            videoEnabled() {
                this.state;
                return this.feed.stream.videoEnabled !== false && Boolean(this?.feed?.stream?.getVideoTracks?.()?.filter?.(v => v.enabled && !v.muted)?.length);
            },
            audioEnabled() {
                this.state;
                return this.feed.stream.audioEnabled !== false && Boolean(this?.feed?.stream?.getAudioTracks?.()?.filter?.(v => v.enabled && !v.muted)?.length);
            },
            muted() {
                return !this.audioEnabled;
            },
            isMyCam() {
                return this.isMe && this.feed.stream === this.$state.localStream;
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
                if (!this.$state.isMobile || !this.isMe) return false;
                return this?.feed?.stream?.id && this.feed.stream.id === this.feed.streams[0].id;
            }
        },
        mixins: [media],
        watch: {
            pinned(n, o) {
                if (n) {
                    this.settings.videoSize.width = this.$refs?.cam?.videoWidth + 'px' || "auto";
                    this.settings.videoSize.height = this.$refs?.cam?.videoHeight + 'px' || "auto";
                } else {
                    this.settings.videoSize = { ...this.defaults.videoSize };
                }
                this.updateDimensions();
            }
        },
        methods: {
            updateDimensions() {
                if (this.pinned) {
                    this.$el.style.gridColumn = `1 / span ${this.gridTemplateColumns}`;
                    this.$el.style.gridRowStart = '1';
                } else {
                    this.$el.style.gridColumn = `unset`;
                    this.$el.style.gridRowStart = `unset`;
                }
            },
            toggleControls(e) {
                this.forceShowControls = !this.forceShowControls
                if (!this.forceShowControls) return;
                /**
                 * @type {HTMLDivElement}
                 */
                const controls = this.$refs.controls;
                /**
                 * 
                 * @param {MouseEvent} e 
                 */
                const listener = e => {
                    log.debug("got a click", e.relatedTarget, controls, controls.contains(e.target));
                    if (e.target !== controls) {
                        this.forceShowControls = false;
                        document.removeEventListener('click', listener)
                    }
                }
                setTimeout(() => {
                    document.addEventListener('click', listener);
                }, 50);
            },
            onUpdate() {
                this.updateDimensions();

            },
            async setupTranscription() {
                /**
                       * @type {import('../../kiwiirc/src/libs/state/BufferState').default}
                       */
                const buf = this.buffer;
                /**
                 * @type {import('../../kiwiirc/src/libs/state/NetworkState').default}
                 */
                const net = this.network;
                /**
                 * @type {import('@types/dom-speech-recognition')}
                 */
                const stupidTypeHack = null;

                const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
                this.$state.recognition = recognition;
                recognition.continuous = true;
                recognition.lang = "en-US";
                recognition.interimResults = true;
                recognition.maxAlternatives = 10;
                const stop = () => {
                    recognition.started = null;
                    this.$state.transcriptionsEnabled = false;
                    updateConference();
                }
                recognition.onspeechstart = (event) => {
                    log.debug("onspeechstart:", event);
                };
                recognition.onspeechend = (event) => {
                    log.debug("onspeechend:", event);
                    // recognition.

                };
                recognition.onstart = () => {
                    recognition.started = Date.now();
                }
                recognition.onresult = (event) => {
                    log.debug("onresult:", event);
                    if (this.$state.transcriptionsEnabled && event.results[event.resultIndex].isFinal) {
                        net.ircClient.action(buf.name, `said: "${event.results[event.resultIndex][0].transcript}"`);
                        stop();
                    }
                };
                const restart = lodash.debounce(() => {
                    if (!this.$state.callState) return;
                    if (!this.$state.transcriptionsEnabled) return;
                    recognition.abort();
                    setTimeout(recognition.start.bind(recognition), 250);
                }, 250);
                recognition.restart = restart;
                recognition.onnomatch = event => {
                    stop();
                }

                recognition.onend = event => {
                    log.debug('onend:', event);
                    if (recognition.started && (Date.now() - recognition.started) > 2000) {
                        stop();
                    }
                }

            },

            setup() {
                /**
                 * @type {HTMLCanvasElement}
                 */
                const canvas = this.$refs.vid;
                // this.setupZoom();
                /**
                 * @type {HTMLVideoElement}
                 */
                const cam = this.$refs.cam;
                const container = this.$refs.container;
                const ctx = canvas.getContext('2d');
                const isMe = this.isMe;
                let volume = 0;
                /**
                 * @type {HTMLDivElement}
                 */
                const el = this.$el;
                const prev = {};
                const draw = async (timestamp) => {
                    if (!this.feed || !this.$refs.cam || !this.visible) return;
                    this.frame = requestAnimationFrame(draw);
                    let elapsed;
                    if (prev.main) {
                        elapsed = timestamp - prev.main;
                    } else {
                        prev.main = timestamp;
                    }

                    // const volumeIndicator = this.$refs.volumeIndicator;
                    // if (audioOutput && volumeIndicator) {

                    //     /**
                    //         * @type {Uint8Array}
                    //         */
                    //     const buf = audioOutput.buffer;
                    //     const data = [...buf.values()].map(d => (d - 128) ** 4);
                    //     const avg = data.reduce((avg, d) => avg += d / data.length, 0);
                    //     const newVolume = avg / 128;
                    //     volume = (!volume || newVolume > volume) ? newVolume : volume - (volume / 8);
                    // }
                    if (!elapsed || elapsed < (1000 / this.settings.frameRate)) return;
                    
                    const bounds = el.getBoundingClientRect();
                    if (
                        (bounds.right < 0 || bounds.left > (document.documentElement.clientWidth || window.innerWidth)) ||
                        (bounds.bottom < 0 || bounds.top > (document.documentElement.clientHeight || window.innerHeight)) 
                    ) {
                        return;
                    }
                    prev.main = timestamp;


                    const audioOutput = this.$refs.audioOutput;
                    audioOutput?.draw instanceof Function && audioOutput.draw();
                    // if (audioOutput && volumeIndicator) {
                    //     let elapsed;
                    //     if (prev.volumeIndicator) {
                    //         elapsed = timestamp - prev.volumeIndicator
                    //     } else {
                    //         prev.volumeIndicator = timestamp;
                    //     }
                    //     if (!elapsed || elapsed < (1000 / this.settings.volumeUpdateRate)) return;
                    //     prev.volumeIndicator = timestamp;

                    //     const percent = volume;
                    //     volumeIndicator.style.transform = `scale(${Math.min(((percent)), 2)})`;
                    //     volumeIndicator.style.opacity = Math.min(percent, 0.6);

                    // }
                    // log.debug("elapsed:", elapsed);
                    const W = cam.videoWidth;
                    const H = cam.videoHeight;
                    canvas.height = cam.offsetHeight;
                    canvas.width = cam.offsetWidth;

                    if (!this.videoEnabled) return;
                    if (this.isMyCam) {

                        if (cam.videoWidth && cam.videoHeight && canvas.width && canvas.height && this.$state.backgroundFx) {
                            /**
                             * @type {import('@tensorflow-models/body-segmentation').BodySegmenter}
                            */
                            const segmenter = this.$state.segmenter;
                            const segmentation = await segmenter.segmentPeople(cam)
                            if (this.$state.backgroundFx.type === 'binaryMask') {
                                const mask = await bodySegmentation.toBinaryMask(segmentation, this.$state.backgroundFx.fg, this.$state.backgroundFx.bg, this.$state.backgroundFx.drawCountour || false, this.$state.backgroundFx.foregroundThreshold)
                                await bodySegmentation.drawMask(canvas, cam, mask, this.$state.backgroundFx.maskOpacity, this.$state.backgroundFx.maskBlur)
                            } else if (this.$state.backgroundFx.type === 'bokeh') {
                                await bodySegmentation.drawBokehEffect(
                                    canvas, cam, segmentation, this.$state.backgroundFx.foregroundThreshold,
                                    this.$state.backgroundFx.backgroundBlur, this.$state.backgroundFx.edgeBlur);
                            }
                            return;

                        }
                    }
                    const dx = canvas.width - W;
                    const dy = canvas.height - H;
                    ctx.drawImage(cam, dx / 2, dy / 2, W, H);
                }
                draw();
                if (!this.isMe) return;
                this.videoOutput = canvas.captureStream(this.settings.frameRate);
                this.setupTracks();




            },
            setupTracks() {
                this.$state.outputFeeds ??= {}
                this.removeTracks();
                /**
                 * @type {MediaStream}
                 */
                const stream = new MediaStream();
                // replace video track with video output
                this.feed.stream.getAudioTracks().forEach(t => stream.addTrack(t));
                this.videoOutput.getVideoTracks().forEach(t => stream.addTrack(t));

                const label = this.feed.stream.network_label;
                if (this.isMe && label) this.$state.outputFeeds[label] = stream;
                updateTracks();
                this.$state.beginLocalStream();
            },
            removeTracks() {
                if (!this.feed.stream.network_label) return;
                const streamTracks = getStreamTracks(this.$state.outputFeeds[this.feed.stream.network_label]);
                removeStreamTracks(streamTracks);
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
                    await this.$state.endMediaStream();
                    const stream = await getUserMedia();
                    this.$state.localStream = stream;
                    this.$state.emit('conference-lite.update');
                } catch (e) {
                    log.error("Failed to flip camera:", e, e.stack);

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
                const enabled = !this.videoEnabled;
                this.feed.stream
                    ?.getVideoTracks?.()
                    ?.filter(Boolean)?.forEach?.(v => { v.enabled = enabled && !v.enabled });

                if (this.isMe) {

                    this.networkStream && setVideo({ net: this.network, target: this.buffer, stream: this.networkStream }, enabled);
                    this.videoEnabled = enabled;
                }
                this.update();
            },
            toggleAudio() {
                const enabled = !this.audioEnabled;

                this.feed.stream
                    ?.getAudioTracks?.()
                    ?.filter(Boolean)?.forEach?.(v => { v.enabled = enabled && !v.enabled });

                if (this.isMe) {

                    this.networkStream && setAudio({ net: this.network, target: this.buffer, stream: this.networkStream }, enabled);
                    this.audioEnabled = enabled;
                }
                this.update();
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
                forceShowControls: false,
                flippingCam: false,
                hasCamDimensions: false,
                settings: {
                    frameRate: 30,
                    volumeUpdateRate: 30,
                    videoSize: {
                        height: kiwi.state.isMobile ? '128px' : '256px',
                        width: kiwi.state.isMobile ? '128px' : '256px'
                    }
                },
                defaults: {
                    videoSize: {
                        height: kiwi.state.isMobile ? '128px' : '256px',
                        width: kiwi.state.isMobile ? '128px' : '256px'
                    }
                },
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
            setupZoom(attempt = 0) {
                if (attempt > 32) return;
                const el = this.$refs.grid;
                if (!el) return setTimeout(() => this.setupZoom(attempt + 1), 50 * attempt);
                this.panzoom = Panzoom(el, {
                    onTouch(e) {
                        return false;
                    }
                })
                const scroller = el;
                const self = this;
                // This demo binds to shift + wheel
                scroller.addEventListener('wheel', function f(event) {
                    if (event.target !== scroller) return;
                    if (!this.panzoom) {
                        self.$nextTick(() => self.setupZoom())
                        return scroller.removeEventListener('wheel', f);
                    }
                    this.panzoom.zoomWithWheel(event)
                });

            },
            resetZoom() {
                if (this.panzoom) {
                    this.panzoom.moveTo(0, 0);
                    this.panzoom.smoothZoomAbs(0, 0, 1);
                }
            },
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
            toggleBackgroundBlur() {
                if (this.$state.backgroundFx) {
                    this.$state.backgroundFx = null;
                }
                this.$state.backgroundFx = {
                    fg: { r: 0, g: 0, b: 0, a: 0 },
                    bg: { r: 0, g: 0, b: 255, a: 255 },
                    foregroundThreshold: 0.5,
                    maskOpacity: 1,
                    maskBlur: 0,
                    type: 'binaryMask',
                    backgroundBlur: 100,
                    edgeBlur: 3,
                }
            },
            toggleTranscriptions() {
                this.$state.transcriptionsEnabled = !this.$state.transcriptionsEnabled;
                this.$state?.recognition?.restart instanceof Function && this.$state?.recognition?.restart?.()
                this.update();
            },
            async screenShare() {
                const self = this;
                if (tryHangItUp()) return;
                /**
                 * @type {MediaStream}
                 */
                let stream;
                try {
                    stream = await navigator.mediaDevices.getDisplayMedia();
                } catch (e) {
                    log.error("Failed to get display stream:", e);
                }
                if (stream) {
                    stream.network_label = "screenshare";
                    this.$state.localStreams.push(stream);
                }
                const tracks = stream.getTracks();
                tracks.forEach(t => {
                    t.onended = e => {
                        tryHangItUp();
                    }
                });

                function tryHangItUp() {
                    const existingScreenShareIdx = self.$state?.localStreams?.findIndex?.(stream => stream.network_label === "screenshare");
                    /**
                     * @type {MediaStream}
                     */
                    const existingScreenShare = existingScreenShareIdx !== -1 && self.$state.localStreams[existingScreenShareIdx]
                    if (existingScreenShareIdx !== -1) {
                        self.$state.localStreams.splice(existingScreenShareIdx, 1);
                        if (!existingScreenShare) return false;
                        existingScreenShare.getTracks().forEach(t => { t.enabled = false; t.stop(); });
                        const networkStream = self.$state.outputFeeds.screenshare;
                        if (networkStream) {
                            networkStream.getTracks().forEach(t => { t.enabled = false; t.stop(); })
                            removeRemoteStream({
                                net: this.network,
                                target: this.buffer,
                                stream: networkStream
                            });
                        }
                        delete self.$state.outputFeeds.screenshare;
                        self.update();
                        return true;
                    }
                }
                // updateTracks();
                this.update();
            },
            async leaveCall() {
                this.$state.tracks = [];
                typeof this.$state.outputFeeds === 'object' && Object.values(this.$state.outputFeeds).forEach(s => {
                    s.getTracks().forEach(t => t.stop() && s.removeTrack(t));
                });
                [this.$state.localStream, ...(this.$state.localStreams || [])].filter(Boolean).forEach(
                    /**
                     * 
                     * @param {MediaStream} s 
                     */
                    s => {
                        s.getTracks().forEach(t => t.stop() && s.removeTrack(t));
                    });
                delete this.$state.localStream;
                this.$state.localStreams = [];
                /**
           * @type {import('../../kiwiirc/src/libs/state/BufferState').default}
           */
                const buf = this.buffer;
                /**
                 * @type {import('../../kiwiirc/src/libs/state/NetworkState').default}
                 */
                const net = this.network;

                delete this.$state.localStreamReady;
                this.$state.emit('mediaviewer.hide');
                net.ircClient.mode(buf.name, '-x', net.nick);
                Object.entries(this.$state.peers).forEach(([id, peer]) => {
                    /**
                     * @type {RTCPeerConnection}
                     */
                    const cnx = peer.connection;
                    cnx && cnx.close();
                });
                this.$state.outputFeeds = {};
                this.$state.peers = {};
                this.$state.callState = null;
                if (this.$state.recognition) {
                    /**
                     * @type {SpeechRecognition}
                     */
                    const recognition = this.$state.recognition;
                    recognition.abort();
                    recognition.stop();
                    recognition.onresult = null;
                    recognition.onstart = null;
                    recognition.onend = null;
                    recognition.onspeechstart = null;
                    recognition.onspeechend = null;
                    recognition.onaudioend = null;
                    recognition.onaudiostart = null;
                    recognition.onnomatch = null;
                    recognition.onsoundend = null;
                    recognition.onsoundstart = null;
                }
                this.update();
            },
        },
        computed: {
            pinned() {
                this.state;
                return this.$state.pinned;
            },
            transcriptionsEnabled() {
                this.state;
                return this.$state.transcriptionsEnabled;
            },
            gridTemplateColumns() {
                return (window.innerWidth < BREAKPOINT ? 2 : Math.min(this.feeds.length, 8));
            },
            cellWidth() {
                this.state;
                return 1 / this.gridTemplateColumns;
            },
            cellWidthPct() {
                this.state;
                return this.cellWidth * 100 + '%';
            },
            cellWidthPx() {
                this.state;
                /**
                 * @type {HTMLDivElement}
                 */
                const grid = this.$refs.grid;
                return this.cellWidth * grid.offsetWidth;
            },
            colSpan() {
                this.state;
                const atBreakpoint = window.innerWidth < BREAKPOINT;
                return atBreakpoint ? 2 : 4;
            },
            visibleFeeds() {
                this.state;
                return this.$state.visibleFeeds;
            }
        },
        data() {
            return {
            }
        },
        mounted() {
            this.$state.$on('conference-lite.update', this.update);
            this.$state.visibleFeeds ??= {};
            this.setupZoom();
            const observer = new IntersectionObserver(entries => {
                log.debug("observer:", entries);
                entries.forEach(e => {
                    this.$state.visibleFeeds[e.target.dataset.id] = e.isIntersecting();
                })
                this.update();
            }, {
                root: this.$refs.conferenceContainer
            });
            this.observer = observer;

        },
        template: `
        <div class="kiwi-conference">
            <div :class={fullscreen} class="conference-container" ref="conferenceContainer" v-resizeobserver="resize">
                <div 
                    class="conference" 
                    ref="grid" 
                    :style="'grid-template-columns: repeat('+gridTemplateColumns+', '+cellWidthPct+');'"
                    
                >
                    <peer
                        :cell-width="cellWidth"
                        :grid-template-columns="gridTemplateColumns"
                        :data-id="feed.stream.id"
                        v-for="feed in feeds" 
                        :key="feed.stream.id"
                        :visible="[true,undefind].includes(visibleFeeds[feed.stream.id])"
                        :component="peer" 
                        v-bind="{ network, buffer, feed }"
                        :pinned="pinned===feed.stream.id"
                        @toggle-pin="() => togglePin(feed.stream.id)"
                    />
                </div>
            </div>
            <div class="conference-controls">
                    <div class="conference-controlbar">
                        <control-btn
                            @click="leaveCall"
                            icon="phone"
                            title="Leave Call"
                            text-class="u-button-warning"
                            :icon-props="{transform: {rotate: 135}}"
                        />  
                        <control-btn
                            @click="screenShare"
                            icon="person-chalkboard"
                            title="Screen Share"
                            text-class="u-button-primary"
                        />
                        <control-btn
                            @click="resetZoom"
                            icon="magnifying-glass"
                            title="rset-zoom"
                        />  
                        <control-btn
                            @click="toggleTranscriptions"
                            :icon="transcriptionsEnabled ? 'comment' : 'comment-slash'"
                            title="Toggle Transcriptions"
                        />  
                        <control-btn
                            @click="toggleBackgroundBlur"
                            icon="image"
                            title="Background Blur"
                        />
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
                this.$state.segmenter ??= await bodySegmentation.createSegmenter(bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation, {
                    runtime: 'mediapipe',
                    solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation',
                    modelType: 'general'
                });
                /**
                    * @type {import('../../kiwiirc/src/libs/state/BufferState').default}
                    */
                const buf = this.buffer;
                /**
                 * @type {import('../../kiwiirc/src/libs/state/NetworkState').default}
                 */
                const net = this.network;
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
                this.$state.meetingChannel = buf.name;

                if (this.$state.callState) return;

                this.$state.callState = 'joining';

                net.ircClient.mode(buf.name, '+x', net.nick);
                document.addEventListener("visibilitychange", function () {

                    setVideo({ net, target: buf, stream: this.$state.localStream }, document.visibilityState === 'visible');
                }, false);
                await Promise.all(Object.values(buf.users).map(
                    /**
                     * 
                     * @param {import('../../kiwiirc/src/libs/state/UserState').default} u 
                     */
                    async u => {
                        log.debug("connecting to...", u);

                        if (u.nick === net.nick || this.$state.peers[u.id]) return;
                        if (!u.buffers[buf.id]?.modes.includes('x')) {
                            log.debug("user not in call, skipping", u);
                            return;
                        }
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
        try {

            kiwi.state.peers[u.id].makingOffer = Date.now();

            await cnx.setLocalDescription();
            net.ircClient.tagmsg(u.nick, removeNulls({
                "+draft/conf-cmd": cnx.localDescription.type.toUpperCase(),
                '+draft/conf-sdp': cnx.localDescription.sdp
            }));
        } catch (e) {
            log.error("negotiation failure:", e);
        }
        finally {
            kiwi.state.peers[u.id].makingOffer = null;
        }
    }
    /**
     * 
     * @param {MediaStreamTrack[]} tracksToRemove 
     */
    function removeStreamTracks(tracksToRemove) {
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
    const RESTART_STATES = ['failed', 'disconnected', 'closed'];
    /**
     * 
     * @param {import('../../kiwiirc/src/libs/state/UserState').default} u 
    * @param {import('../../kiwiirc/src/libs/state/BufferState').default} buf
    * @param {import('../../kiwiirc/src/libs/state/NetworkState').default} net
     * 
     */
    async function connect(u, buf, net) {
        if (u.id === kiwi.state.getActiveNetwork().currentUser().id) return;
        kiwi.state.peers ??= {};
        const existingPeer = kiwi.state.peers[u.id];
        /**
         * @type {RTCPeerConnection}
         */
        const existingCnx = existingPeer?.connection;
        if (existingCnx && RESTART_STATES.includes(existingCnx.connectionState)) {
            existingCnx.close();
            delete kiwi.state.peers[u.id];
        }
        kiwi.state.peers[u.id] ??= mkPeer(u.id);
        const peer = kiwi.state.peers[u.id];
        if (peer.connection) return peer.connection;
        peer.connection = new RTCPeerConnection();
        /**
         * @type {RTCPeerConnection}
         */
        const cnx = peer.connection;
        const candidateQueue = [];
        peer.addIceCandidate = candidate => {
            log.debug("adding candidate", candidate, cnx.remoteDescription);
            if (!cnx?.remoteDescription?.type) {
                candidateQueue.push(candidate);
            } else {
                return cnx.addIceCandidate(candidate);
            }
        }
        peer.consumeIceCandidates = async () => {
            while (candidateQueue.length) {
                await cnx.addIceCandidate(candidateQueue.shift());
            }
        }
        cnx.onicecandidate = e => {
            log.debug("Ice candidate...", e);
            net.ircClient.tagmsg(
                u.nick,
                removeNulls({
                    '+draft/conf-cmd': "ICE_CANDIDATE",
                    '+draft/conf-candidate': e?.candidate?.candidate,
                    '+draft/conf-sdpmid': e?.candidate?.sdpMid,
                    '+draft/conf-sdpmlineindex': e?.candidate?.sdpMLineIndex,
                })
            );
        };
        cnx.ontrack = e => {
            log.debug("got a track", e);

            peer.streamSettings && e.streams.forEach(stream => {
                const existingSettings = peer.streamSettings[stream.id];
                if (existingSettings) {
                    Object.assign(stream, existingSettings);
                }
            });
            peer.streams ??= [];
            peer.streams = peer.streams.concat(e.streams.filter(s => !peer.streams.find(s2 => s2.id === s.id))).filter(s => s.active).slice(0, 2);
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
        peer.makingOffer = null;
        cnx.addEventListener('negotiationneeded', async e => {
            await negotiate(cnx, u, net)
        })
        cnx.addEventListener('iceconnectionstatechange', async e => {
            let attempt = 0;
            while (cnx.iceConnectionState === 'disconnected') {
                await new Promise(resolve => setTimeout(resolve, Math.min(++attempt * 50, 10000)));
                if (RESTART_STATES.includes(cnx.connectionState)) return;
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
    function getStreamTracks(streams) {
        streams = streams instanceof Array ? streams : [streams]
        return streams.filter(Boolean).flatMap(stream => stream.getTracks().map(track => ({ stream, track })))
    }
    /**
     * 
     * @param {{connection: RTCPeerConnection, tracks: RTCRtpSender[]}} peer
     */
    function setTracks(peer, attempt = 0) {
        if (!peer.connection) return setTimeout(() => setTracks(peer, attempt + 1), 100 * attempt);
        if (attempt >= 100) return;
        // peer.connection.getSenders().forEach(s => peer.connection.removeTrack(s));
        const tracks = getStreamTracks(Object.values(kiwi.state.outputFeeds));
        tracks.forEach(({ track, stream }) => {
            log.debug("adding track", track);
            if (!peer.connection.getSenders().find(s => s.track && s.track.id === track.id)) peer.connection.addTrack(track, stream);
        });

    }
    async function getUserMedia() {
        /** @type {MediaTrackConstraints}*/
        kiwi.state.mediaConstraints ??= {
            audio: true,
            video: kiwi.state.isMobile ? {
                facingMode:
                    'user'

            } : true
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
        s.network_label = 'cam';
        return s;
    }
    /**
     * 
     * @param {{ net: import('../../kiwiirc/src/libs/state/NetworkState').default, target: object, stream: MediaStream }} param0 
     * @param {*} enabled 
     * @returns 
     */
    function setAudio(param0, enabled) {
        return conferenceSetting(param0, "+draft/conf-audio", enabled);
    }
    /**
     * 
     * @param {{ net: import('../../kiwiirc/src/libs/state/NetworkState').default, target: object, stream: MediaStream }} param0 
     * @param {*} enabled 
     * @returns 
     */
    function setVideo(param0, enabled) {
        return conferenceSetting(param0, "+draft/conf-video", enabled);
    }
    /**
     * 
     * @param {{ net: import('../../kiwiirc/src/libs/state/NetworkState').default, target: object, stream: MediaStream }} param0 
     * @param {*} enabled 
     * @returns 
     */
    function removeRemoteStream(param0, enabled) {
        return conferenceSetting(param0, "+draft/conf-rmstream", 1);
    }
    function conferenceSetting({ net, target, stream }, tag, enabled) {
        if (!stream) return;
        const v = enabled ? 1 : 0;
        net = (net || kiwi.state.getActiveNetwork());
        target = (target || kiwi.state.getActiveBuffer());
        kiwi.state.conferenceSettings ??= {};
        kiwi.state.conferenceSettings[stream.id] ??= {}
        kiwi.state.conferenceSettings[stream.id][tag] = v;
        if (!net) return;
        if (!target) return;
        net.ircClient.tagmsg(target.nick || target.name, {
            "+draft/conf-cmd": "SETTINGS",
            [tag]: v,
            "+draft/conf-stream": (stream || kiwi.state.localStream).id
        });
    }
    function updateConference() {
        kiwi.state.$emit('conference-lite.update');

    }
    function removePeer(peer) {
        log.debug("Removing peer:", peer);
        if (!peer) return;
        delete kiwi.state.peers[peer.id];
        peer.connected = false;
        if (!peer.connection) return;
        peer.streams = [];
        peer.connection.getSenders().forEach(t => peer.connection.removeTrack(t));
        peer.connection.close()
        delete peer.connection;
        delete peer.streams;
        updateConference();
        log.debug("peer removed");
    }
    const nickUserId = {};
    function getPeer(nick) {
        const user = network.users[nick.toUpperCase()] || nickUserId[nick];
        const peer = kiwi.state?.peers?.[user.id];
        nickUserId[nick] = user.id;
        return peer;
    }
    function reduce(numerator, denominator) {
        var gcd = function gcd(a, b) {
            return b ? gcd(b, a % b) : a;
        };
        gcd = gcd(numerator, denominator);
        return [numerator / gcd, denominator / gcd];
    }
    function even(n) {
        return ((n + 1) >> 1) << 1;
    }
    function getCellDimensions(width, height, maxRowspan, maxColspan) {
        while (width > maxColspan || height > maxRowspan) {
            const [w, h] = reduce(even(width), even(height));
            width = w;
            height = h;
            console.log({ width, height });
        }
        return [width, height];
    }
    function mkPeer(id) {
        return {
            id,
            new: true,
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
    /**
         * 
         * @type { import('../../kiwiirc/src/libs/state/NetworkState').default}
         */
    let network = kiwi.state.getActiveNetwork();
    !network && await new Promise((resolve, reject) => kiwi.on('start', async () => {
        resolve();
    }))

    if (!network) network = kiwi.state.getActiveNetwork();
    network.ircClient.use(
        /**
            * 
            * @param {import('irc-framework/src/client')} client 
            * @param {import('middleware-handler')} raw 
            * @param {import('middleware-handler')} parsed 
            */
        (client, raw, parsed) => {
            const historical = event?.batch?.type === 'chathistory';
            if (historical) return next();
            parsed.use(async (event_name, event, client, next) => {
                log.debug('got event...?', event);
                if (event_name === 'quit') {
                    const peer = getPeer(event.nick);
                    removePeer(peer);
                }
                if (event_name === 'part') {
                    if (event.channel === kiwi.state.meetingChannel) {
                        const peer = getPeer(event.nick);
                        removePeer(peer);
                    }
                }
                if (event_name === 'mode') {
                    const leaveMeetingMode = event.modes.find(m => m.mode === '-x');
                    log.debug("got mode", event.modes);
                    if (leaveMeetingMode) {

                        const peer = getPeer(leaveMeetingMode.param);
                        removePeer(peer);
                    }
                    const buf = network.bufferByName(event.target);
                    // return kiwi.state.addMessage(buf, {
                    //     leftMeeting: true,
                    //     ...event
                    // })
                }
                if (event_name.toUpperCase() === 'TAGMSG') {
                    const ignore = event.target !== network.nick && event.tags["+draft/conf-cmd"] !== "SETTINGS";
                    if (ignore) return next();
                    const buf = network.bufferByName(event.nick) || kiwi.state.addBuffer(network.id, event.nick);
                    const user = network.users[event.nick.toUpperCase()];
                    const type = event.tags["+draft/conf-cmd"];
                    log.debug("Peer TAGMSG", event_name, type, buf.name, user, event);
                    if (!user) return next();
                    await connect(user, buf, network);
                    log.debug('processing tagmsg...');
                    const sdp = event.tags["+draft/conf-sdp"];
                    kiwi.state.peers ??= {};
                    kiwi.state.peers[user.id] ??= mkPeer(user.id);
                    const peer = kiwi.state.peers[user.id];
                    if (peer.new) {
                        peer.new = false;
                        kiwi.state.conferenceSettings && Object.entries(kiwi.state.conferenceSettings).forEach(([streamId, settings]) => {
                            network.ircClient.tagmsg(event.nick, {
                                '+draft/conf-cmd': 'SETTINGS',
                                '+draft/conf-stream': streamId,
                                ...settings
                            });
                        });
                    }
                    switch (type) {
                        case 'SETTINGS': {
                            if (event.nick === kiwi.state.getActiveNetwork().nick) return next();
                            // return next();\
                            /**
                             * @type {RTCPeerConnection}
                             */
                            const cnx = peer.connection;
                            const video = event.tags["+draft/conf-video"];
                            const audio = event.tags["+draft/conf-audio"];
                            const streamId = event.tags["+draft/conf-stream"];
                            const rm = event.tags["+draft/conf-rmstream"];
                            const streamIdx = streamId && peer?.streams?.findIndex?.(s => s.id === streamId);
                            /**
                             * @type {MediaStream}
                             */
                            const stream = peer.streams && streamIdx !== -1 && peer.streams[streamIdx]
                            const removeStream = rm == 1;
                            if (stream && removeStream) {
                                peer.streams.splice(streamIdx, 1);
                                const ids = [];
                                stream.getTracks()
                                    .forEach(t => t.stop() && ids.push(t.id))
                                const toRemove = cnx.getSenders().filter(s => s.track && ids.includes(s.track.id));
                                toRemove.forEach(sender => {
                                    cnx.removeTrack(sender);
                                });
                                updateConference();
                                return next();
                            }
                            const videoEnabled = video == 1;
                            const audioEnabled = audio == 1;
                            peer.streamSettings ??= {};
                            peer.streamSettings[streamId] ??= {};
                            log.debug("video settings:", { tags: event.tags, stream, streamId, peer: { ...peer } })
                            if (video !== undefined) {
                                if (stream) stream.videoEnabled = videoEnabled;
                                peer.streamSettings[streamId].videoEnabled = videoEnabled
                            }
                            if (audio !== undefined) {
                                if (stream) stream.audioEnabled = audioEnabled;
                                peer.streamSettings[streamId].audioEnabled = audioEnabled
                            }

                            updateConference()
                            return;
                        }

                        case 'ANSWER':
                        case 'OFFER': {
                            if (!kiwi.state.callState) return;
                            peer.negotiate = async function () {
                                log.debug("negotiating");
                                const cnx = await connect(user, buf, network);
                                await cnx.setRemoteDescription({ type: type.toLowerCase(), sdp });
                                await peer.consumeIceCandidates();

                                if (type !== 'OFFER') {
                                    peer.connected = true;
                                    return next();
                                }
                                await cnx.setLocalDescription();

                                network.ircClient.tagmsg(event.nick, removeNulls({
                                    "+draft/conf-cmd": cnx.localDescription.type.toUpperCase(),
                                    '+draft/conf-sdp': cnx.localDescription.sdp
                                }));
                                peer.connected = true;

                            }
                            const received = new Date(event.tags.time).getTime();
                            const ignoreOffer = peer.makingOffer || peer?.connection?.signalingState !== 'stable';
                            const impolite = peer.makingOffer && received < peer.makingOffer;
                            if (impolite && ignoreOffer) return next();
                            await peer.negotiate();
                            break;
                        }

                        case 'ICE_CANDIDATE': {
                            const cnx = peer.connection;
                            if (cnx) {
                                const candidate = {
                                    candidate: event.tags['+draft/conf-candidate'],
                                    sdpMid: event.tags['+draft/conf-sdpmid'],
                                    sdpMLineIndex: event.tags['+draft/conf-sdpmlineindex'],
                                }
                                log.debug("Adding ice candidate", candidate);

                                await peer.addIceCandidate(candidate.candidate ? candidate : null);
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