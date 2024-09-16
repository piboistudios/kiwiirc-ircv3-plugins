kiwi.plugin('url-handler', async function (kiwi, log) {
    await new Promise((resolve, reject) => kiwi.state.$once('start', async () => {
        resolve();
    }));
    await new Promise((resolve) => kiwi.state.$once('message.render', resolve));
    
    /**
     * 
     * @type { import('../../kiwiirc/src/libs/state/NetworkState').default}
     */
    const network = kiwi.state.getActiveNetwork();
    /**
     * @type {URL}
     */
    const url = kiwi.state.entrypoint;
    const fragment = url.hash;
    const handleProto = fragment.indexOf('#ircs://') === 0 || fragment.indexOf('#irc://') === 0;
    let buf = url.pathname.split('/').pop() || fragment;
    const CHANTYPES = network.ircClient.network.supports('CHANTYPES');
    let chan = CHANTYPES ? CHANTYPES.indexOf(buf.charAt(0)) !== -1 ? buf : false : false;
    let msgid = url.searchParams.get('msgid');
    let nick = url.searchParams.get('nick') || buf;
    if (nick.charAt(0) === '@') nick = nick.slice(1)
    if (handleProto) {
        const thisServer = kiwi.state.setting('startupOptions');
        const protoUrlStr = fragment.slice(1);
        const protoUrl = new URL(protoUrlStr);
        const protoPort = protoUrl.port || protoUrl.protocol === 'ircs:' ? 6697 : protoUrl.protocol === 'irc:' ? 6667 : '';
        if (protoUrl.host === thisServer.server && protoPort == thisServer.port) {
            const fragment = protoUrl.hash;
            chan = protoUrl.pathname.split('/').pop() || fragment;
            nick = protoUrl.searchParams.get('nick');
            msgid = protoUrl.searchParams.get('msgid');
        }
    }
    window.history.replaceState(null, '', kiwi.state.history.baseUrl);
    log.debug("Setting active buffer");
    let buffer = network.bufferByName(chan || nick);
    if (!buffer) buffer = kiwi.state.addBuffer(network.id, chan || nick);
    buffer.join();
    kiwi.state.setActiveBuffer(network.id, chan || nick);
    if (msgid) {
        kiwi.state.$emit('messagelist.scrollto', msgid);
    }
});