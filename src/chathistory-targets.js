kiwi.plugin('chathistory-targets', async function(kiwi, log) {
    kiwi.addUi("statebrowser_buffer", {
        template: `
            <div 
                class="kiwi-statebrowser-channel-label compact" 
                v-if="shouldShow"
            >
                <div class="unread-indicator"/>
            </div>
        `,
        computed: {
            shouldShow() {
                if (!this?.buffer?.last_read) return false;
                const ts = this.buffer.flag('last_known_ts')
                return this.buffer.last_read <= ts;
            }
        },
        props: ['buffer', 'network']
    });
    await new Promise((resolve, reject) => kiwi.on('start', async () => {
        resolve();
    }));
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
            raw.use(
                /**
                 * 
                 * @param {string} event_name 
                 * @param {import('irc-framework/src/ircmessage')} event 
                 * @param {*} next 
                 * @returns 
                 */
                (event_name, event, line, client, next) => {
                    if (event_name === 'CHATHISTORY' && event.params[0] === 'TARGETS') {
                        const [target, timestamp] = event.params.slice(1);
                        log.debug("chathistory targets:", {target, timestamp});
                        const buf = network.bufferByName(target);
                        buf.flag('last_known_ts', new Date(timestamp).getTime());
                        return next();
                    }
                    next();
                    
                }
            );
        }
    );
});