// Copyright 2022-2023 Simon Ser <contact@emersion.fr>
// Derived from https://github.com/Libera-Chat/gamja/blob/production/lib/oauth2.js
// Originally released under the AGPLv3, relicensed to the Ergo project under the MIT license
// Modifications copyright 2024 Gabriel Hayes <webmaster@gabe-develops.tech>
// Released under the MIT license
// function callsite() {
//     var orig = Error.prepareStackTrace;
//   Error.prepareStackTrace = function(_, stack){ return stack; };
//   var err = new Error;
//   Error.captureStackTrace(err, arguments.callee);
//   var stack = err.stack;
//   Error.prepareStackTrace = orig;
//   return stack;
// }
// console.log("Stack:", callsite());
const NUMERICS = require('irc-framework/src/commands/numerics');
const COMMANDS = Object.fromEntries(Object.entries(NUMERICS).map(e => [e[1], e[0]]));
function formatQueryString(params) {
    let l = [];
    for (let k in params) {
        l.push(encodeURIComponent(k) + "=" + encodeURIComponent(params[k]));
    }
    return l.join("&");
}

async function fetchServerMetadata(url) {
    // TODO: handle path in config.oauth2.url
    let resp;
    try {
        resp = await fetch(url + "/.well-known/oauth-authorization-server");
        if (!resp.ok) {
            throw new Error(`HTTP error: ${resp.status} ${resp.statusText}`);
        }
    } catch (err) {
        console.warn("OAuth 2.0 server doesn't support Authorization Server Metadata (retrying with OpenID Connect Discovery): ", err);
        resp = await fetch(url + "/.well-known/openid-configuration");
        if (!resp.ok) {
            throw new Error(`HTTP error: ${resp.status} ${resp.statusText}`);
        }
    }

    let data = await resp.json();
    if (!data.issuer) {
        throw new Error("Missing issuer in response");
    }
    if (!data.authorization_endpoint) {
        throw new Error("Missing authorization_endpoint in response");
    }
    if (!data.token_endpoint) {
        throw new Error("Missing authorization_endpoint in response");
    }
    if (!data.response_types_supported?.includes?.("code")) {
        throw new Error("Server doesn't support authorization code response type");
    }
    return data;
}
let redirecting = false;
function redirectAuthorize({ serverMetadata, clientId, redirectUri, scope }) {
    if (redirecting) return;
    redirecting = true;
    // TODO: move fragment to query string in redirect_uri
    // TODO: use the state param to prevent cross-site request
    // forgery
    let params = {
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
    };
    if (scope) {
        params.scope = scope;
    }
    try {

        window.location.assign(serverMetadata.authorization_endpoint + "?" + formatQueryString(params));
    } catch (e) {
        redirecting = false;
    }
}

function buildPostHeaders(clientId, clientSecret) {
    let headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
    };
    if (clientSecret) {
        headers["Authorization"] = "Basic " + btoa(encodeURIComponent(clientId) + ":" + encodeURIComponent(clientSecret));
    }
    return headers;
}

async function exchangeCode({ serverMetadata, redirectUri, code, clientId, clientSecret }) {
    let data = {
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
    };
    if (!clientSecret) {
        data.client_id = clientId;
    }

    let resp = await fetch(serverMetadata.token_endpoint, {
        method: "POST",
        headers: buildPostHeaders(clientId, clientSecret),
        body: formatQueryString(data),
    });

    if (!resp.ok) {
        throw new Error(`HTTP error: ${resp.status} ${resp.statusText}`);
    }
    data = await resp.json();

    if (data.error) {
        throw new Error("Authentication failed: " + (data.error_description || data.error));
    }

    return data;
}

async function introspectToken({ serverMetadata, token, clientId, clientSecret }) {
    let resp = await fetch(serverMetadata.introspection_endpoint, {
        method: "POST",
        headers: buildPostHeaders(clientId, clientSecret),
        body: formatQueryString({ token }),
    });
    if (!resp.ok) {
        throw new Error(`HTTP error: ${resp.status} ${resp.statusText}`);
    }
    let data = await resp.json();
    if (!data.active) {
        throw new Error("Expired token");
    }
    return data;
}
// END LICENSED CODE
kiwi.plugin('sasl-oauth-external-startup', function (kiwi, log) {

    /**
     * @type {import('uuid')} - uuid lib must be exported from kiwi installation
     * @example
     * ```
     * 'kiwi public'; 
     *   
     *   import uuid from 'uuid';    
     *   
     *   export default uuid;
     * ```
     */
    const { v4: uuidv4 } = require('uuid');
    console.log("uuid?", uuidv4());
    const Misc = kiwi.require('helpers/Misc');
    const Logger = kiwi.require('libs/Logger');
    Logger.setLevel(2);
    Logger.enableSourceLogging();
    log.debug("ayeeeee");
    const saslStartup = ({
        template: `<p>Logging in...{{ error }}</p>`,
        data() {
            return {
                error: null,//"(or not, whoops broke things atm)",
                title: 'Where are you connecting today?',
                buttonText: '',
                server_type: 'default',
                server: 'lou-net.ngrok.io:443',
                tls: false,
                nick: '',
                password: '',
                encoding: 'utf8',
                channel: '',
                znc_network: '',
                znc_network_support: true,
                direct: false,
                direct_path: '',
                show_type_switcher: true,
                show_password_box: false,
                is_connecting: false,
                network: null,
            };
        },
        async created() {
            const params = new URLSearchParams(location.search);
            kiwi.state.entrypoint = new URL('' + location);
            window.addEventListener('beforeunload', () => {
                forceSaveState();
            });
            await this.$state.persistence.loadStateIfExists();
            log.debug("saved connection options", JSON.stringify(this.$state.setting('connection.options') || null, null, 4));
            const oauth2 = this.$state.setting('oauth2');
            const url = new URL(this.$state.setting('baseURl') || '' + location);
            url.searchParams.delete('code');
            const trail = url.toString().charAt(url.length-1) === '/' ? '/' : ''
            history.replaceState({}, '', url + trail);
            this.$nextTick(() => {
                this.$state.history = new (kiwi.require('libs/History').History)(this.$state.setting('baseUrl') || '' + window.location)
            })
            let redirectUri = window.location.toString()
            log.debug("redirect uri:", redirectUri);
            // if (redirectUri.charAt(redirectUri.length - 1) === '/') redirectUri = redirectUri.slice(0, -1);
            function authorize(meta) {
                redirectAuthorize({
                    serverMetadata: meta,
                    clientId: oauth2.clientId,
                    redirectUri,
                    scope: oauth2.scope
                });
            }

            /**
             * @type {{
            *  ircClient: import('irc-framework').Client
            * }}
            */
            let net;
            const hasAuthCode = params.has('code');
            const anon = params.has('anon');
            let access_token;
            if (hasAuthCode && oauth2.baseURL) {
                const meta = await fetchServerMetadata(oauth2.baseURL);
                try {

                    access_token = (await exchangeCode({
                        serverMetadata: meta,
                        code: params.get('code'),
                        redirectUri,
                        clientId: oauth2.clientId
                    })).access_token
                    window.history.replaceState({}, document.title, redirectUri);

                } catch (e) {
                    log.error('failed to fetch auth token:', e);
                    // authorize(meta)
                }
            }
            // if(!params.has('code')) {

            // } else {

            // }
            const server = this.$state.setting('startupOptions.server');
            const host = server;
            const port = this.$state.setting('startupOptions.port');
            const tls = this.$state.setting('startupOptions.tls');
            let nick = 'anon';
            const hasNetwork = this.$state.networks.length > 0;
            if (hasNetwork) {
                net = this.$state.networks[0];
                this.$state.setActiveBuffer(net.id, net.serverBuffer().name);
            } else {

                net = this.$state.addNetwork('Network', nick, {
                    host,
                    server: host,
                    port,
                    tls,
                    direct: true,
                    nick,
                    username: nick,
                    sasl_mechanism: hasAuthCode ? 'OAUTHBEARER' : anon ? "ANONYMOUS" : undefined,
                    sasl_mechanisms: [
                        'EXTERNAL',
                        'OAUTHBEARER',
                        'ANONYMOUS',
                    ],
                    ...(this.$state.setting('connection.options') || {})
                });
            }


            this.$state.persistence.watchStateForChanges();

            if (net) {
                let hasSetActiveBuffer = false;

                let bufferObjs = Misc.extractBuffers(this.channel);
                bufferObjs.forEach((bufferObj, idx) => {
                    let buffer = this.$state.addBuffer(net.id, bufferObj.name);
                    buffer.enabled = true;

                    if (bufferObj.key) {
                        buffer.key = bufferObj.key;
                    }

                    if (idx === 0) {
                        this.$state.setActiveBuffer(net.id, buffer.name);
                        hasSetActiveBuffer = true;
                    }
                });

                if (!hasSetActiveBuffer) {
                    this.$state.setActiveBuffer(net.id, net.serverBuffer().name);
                }

                this.is_connecting = true;
                this.network = net;
                net.ircClient.requestCap('sasl');
                if (this.$state.setting('eventPlaybackEnabled')) net.ircClient.requestCap('draft/event-playback');
                if (this.$state.setting('echoMessages')) net.ircClient.requestCap('echo-message');
                if (this.$state.setting('labeledResponses')) net.ircClient.requestCap('draft/labeled-response');
                if (this.$state.setting('messageRedaction')) net.ircClient.requestCap('draft/message-redaction');
                net.ircClient.connect({
                    host,
                    server: host,
                    port,
                    tls,
                    direct: true,
                    nick,
                    username: nick,
                    sasl_mechanism: hasAuthCode ? 'OAUTHBEARER' : anon ? "ANONYMOUS" : undefined,
                    sasl_mechanisms: [
                        'EXTERNAL',
                        'OAUTHBEARER',
                        'ANONYMOUS',
                    ],
                    ...(this.$state.setting('connection.options') || {})
                });
                net.ircClient.use(
                    /**
                     * 
                     * @param {import('irc-framework/src/client')} client 
                     * @param {import('middleware-handler')} raw 
                     * @param {import('middleware-handler')} parsed 
                     */
                    (client, raw, parsed) => {
                        raw.use(
                            async (command, message, raw_line, _, next) => {
                                if (command.toUpperCase() === 'CAP' && message.params[1] === 'ACK') {
                                    if (!client.connection.options.sasl_mechanism) client.connection.options.sasl_mechanism = client.connection.options.sasl_mechanisms[0];
                                }
                                if (client.connection.options.sasl_mechanism === "OAUTHBEARER")
                                    if (!access_token) {
                                        if (!hasAuthCode && !anon) {

                                            (client.network.cap.negotiating || client.network.cap.enabled.includes('sasl')) && client.raw("AUTHENTICATE", "*");
                                            this.$state.setting('sasl.client_response', null);
                                            const meta = await fetchServerMetadata(oauth2.baseURL);
                                            return authorize(meta);
                                        } else {

                                            log.debug("No token or authorization code, skipping OAUTHBEARER mechanism...");
                                            const nextMechIdx = client.connection.options.sasl_mechanisms.indexOf('OAUTHBEARER') + 1;
                                            client.connection.options.sasl_mechanism = client.connection.options.sasl_mechanisms[nextMechIdx]
                                        }
                                    }
                                next();
                            }
                        )
                        const self = this;
                        function saveSaslState() {
                            self.$state.setting('connection.options', {
                                ...(self.$state.setting('connection.options') || {}),
                                sasl_mechanism: client.connection.options.sasl_mechanism
                            })
                        }
                        raw.use(

                            /**
                             * 
                             * @param {string} command 
                             * @param {import('irc-framework/src/ircmessage')} message 
                             * @param {string} raw_line  
                             * @param {*} next  
                             * @returns 
                             */
                            async (command, message, raw_line, _, next) => {
                                log.debug("raw line", command, message, raw_line);
                                if (command == COMMANDS["ERR_SASLFAIL"]) {
                                    const self = this;

                                    const failedMech = client.connection.options.sasl_mechanism;
                                    const nextMechIdx = client.connection.options.sasl_mechanisms.indexOf(failedMech) + 1;
                                    if (nextMechIdx > client.connection.options.sasl_mechanisms.length) {
                                        return abort();
                                    }
                                    client.connection.options.sasl_mechanism = client.connection.options.sasl_mechanisms[nextMechIdx];
                                    log.debug("SASL FAIL", raw_line);
                                    log.debug("failed mech:", failedMech);
                                    log.debug("next mech:", client.connection.options.sasl_mechanism)
                                    saveSaslState();

                                    if (!access_token && client.connection.options.sasl_mechanism === 'OAUTHBEARER') {
                                        if (!hasAuthCode) {

                                            client.raw("AUTHENTICATE", "*");
                                            this.$state.setting('sasl.client_response', null);
                                            const meta = await fetchServerMetadata(oauth2.baseURL);
                                            return authorize(meta);
                                        } else { // failed to get oauth token with existing auth code, skip oauth mech
                                            if (nextMechIdx + 1 > client.connection.options.sasl_mechanisms.length) return abort();

                                            client.connection.options.sasl_mechanism = client.connection.options.sasl_mechanisms[nextMechIdx + 1];
                                        }
                                    }
                                    if (!client.connection.options.sasl_mechanism) {
                                        return abort();
                                    }
                                    function abort() {
                                        log.debug("Sasl aborted:", new Error().stack);
                                        client.raw("AUTHENTICATE", "*");
                                        self.$state.setting('connection.options', null);
                                        return client.connection.options.sasl_disconnect_on_fail && client.connection.end();
                                    }
                                    return client.raw("AUTHENTICATE", client.connection.options.sasl_mechanism);
                                }
                                else if (command.toUpperCase() === 'AUTHENTICATE' && message.params[0] === '+') {
                                    switch (client.connection.options.sasl_mechanism) {

                                        case 'EXTERNAL': {
                                            client.raw('AUTHENTICATE', '+');
                                            break;
                                        }
                                        case 'OAUTHBEARER': {


                                            const commands = this.$state.setting('sasl.client_response') || [];
                                            if (commands?.length) {
                                                while (commands.length) {
                                                    const line = commands.shift();
                                                    client.raw(...line);
                                                }
                                                this.$state.setting('sasl.client_response', commands);
                                                return;
                                            }
                                            const b64 = btoa([`n,a=${this.nick},`, `host=${location.hostname}`, `port=${location.port || (location.protocol === 'https:' ? 443 : 80)}`, `auth=Bearer ${access_token}`].join('\x01'));
                                            const singleAuthCommandLength = 400;
                                            let sliceOffset = 0;
                                            function send(...args) {
                                                const line = args;
                                                commands.push(args);
                                                return client.raw(...args);
                                            }
                                            let it = 0;
                                            while (b64.length > sliceOffset) {
                                                log.debug("iteration:", it++)
                                                send('AUTHENTICATE ' + b64.substr(sliceOffset, singleAuthCommandLength));
                                                sliceOffset += singleAuthCommandLength;
                                            }
                                            if (b64.length === sliceOffset) {
                                                send('AUTHENTICATE +');
                                            }
                                            this.$state.setting('sasl.client_response', commands);
                                            break;
                                        }
                                        case 'ANONYMOUS': {
                                            const idx = client.connection.options.sasl_mechanisms.indexOf('ANONYMOUS');
                                            client.connection.options.sasl_mechanism = client.connection.options.sasl_mechanisms[(idx + 1) % (client.connection.options.sasl_mechanisms.length - 1)];
                                            saveSaslState();
                                            client.raw("AUTHENTICATE", btoa('anon'));
                                            break;
                                        }
                                    }

                                    return;
                                }
                                next();
                            })
                        parsed.use((event_name, event_arg, client, next) => {
                            log.debug("PARSED:", event_name, event_arg)
                            next();
                        })
                    });
                let attemptedReauth = false;
                // net.ircClient.on('sasl failed', async e => {

                // })
                net.ircClient.on('connecting', e => {
                    console.log("connecting?", e);
                })
                let onRegistered = async () => {
                    setTimeout(() => { this.is_connecting = false; }, 1000);
                    this.$state.persistence.storageKey += '/' + net.ircClient.nick;
                    this.$emit('start');
                    this.$state.$emit('start');
                    net.ircClient.off('registered', onRegistered);
                    net.ircClient.off('close', onClosed);
                };
                let onClosed = () => {
                    setTimeout(() => { this.is_connecting = false; }, 1000);
                    net.ircClient.off('registered', onRegistered);
                    net.ircClient.off('close', onClosed);
                };
                net.ircClient.once('registered', onRegistered);
                net.ircClient.once('close', onClosed);
                function forceSaveState() {
                    if (!anon)
                        kiwi.state.persistence.storage.set(kiwi.state.persistence.storageKey, kiwi.state.persistence.state.exportState(kiwi.state.persistence.includeBuffers));


                }
            }

        }
    })
    kiwi.addStartup(
        'sasl-oauth-external', saslStartup);
    // console.log(kiwi.getStartups)
});
