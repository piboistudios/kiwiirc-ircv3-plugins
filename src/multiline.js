kiwi.plugin('multiline', function (kiwi, log) {
    const batches = {};
    /**
     * @type {import('uuid')} - uuid must be installed in root kiwi instance
     */
    const { v4: uuidv4 } = require('uuid');
    /**
     * @type {typeof import('irc-framework/src/ircmessage')}
     */
    const { Message: IrcMessage } = require('irc-framework')

    /**
     * @type {import('irc-framework/src/linebreak')["lineBreak"]}
     */
    const { lineBreak } = require('irc-framework/src/linebreak');
    log.debug("Line break:", lineBreak);
    /**
     * @type {import('../../kiwiirc/src/libs/InputHandler')}
     */
    const InputHandler = kiwi.require('libs/InputHandler');

    kiwi.state.$on('input.raw', (input, context) => {
        // let lines = input.split('\n');
        // lines.forEach((line) => this.processLine(line, context));
        function f() {
            context = context || inputHandler.defaultContext();
            log.debug("input and context", { input, context });
            inputHandler.processLine(input, context, true);
        }
        inputHandler ? f() : deferred.push(f);
    });
    const deferred = [];
    const originalProcess = InputHandler.prototype.processLine;
    let inputHandler;
    InputHandler.prototype.processLine = function processLine(rawLine, context, actuallyProcessLine) {
        inputHandler = this;
        while (deferred.length) {
            deferred.pop()();
        }
        if (!actuallyProcessLine) return;
        return originalProcess.apply(this, [rawLine, context]);
    }
    // sending
    kiwi.on('network.connecting', async e => {
        /**@type {{network: import('../../kiwiirc/src/libs/state/NetworkState').default}} */
        const { network } = e;
        const { ircClient } = network;

        ircClient.sendMessage = function sendMessage(commandName, target, message, tags) {
            log.debug('sending msg', ...arguments, new Error().stack);
            const lines = [message];

            lines.forEach(line => {
                // Maximum length of target + message we can send to the IRC server is 500 characters
                // but we need to leave extra room for the sender prefix so the entire message can
                // be sent from the IRCd to the target without being truncated.
                const blocks = [
                    ...lineBreak(line, {
                        bytes: 512 - 64,
                        allowBreakingWords: true,
                        allowBreakingGraphemes: true,
                    })
                ].flatMap(b => b.split(/\r\n|\n|\r/));
                let batchId;
                log.debug("Blocks", { blocks });
                if (blocks.length > 1) {
                    batchId = uuidv4();
                    const msg = new IrcMessage("BATCH", `+${batchId}`, "draft/multiline", target);
                    msg.tags = tags;
                    this.raw(msg.to1459());
                }
                if (batchId) {
                    tags = {};
                    tags.batch = batchId;
                }
                blocks.forEach(block => {
                    if (tags && Object.keys(tags).length) {
                        const msg = new IrcMessage(commandName, target, block);
                        log.debug("msg", { msg });
                        msg.tags = tags;

                        this.raw(msg.to1459());
                    } else {
                        this.raw(commandName, target, block);
                    }
                });
                if (batchId) this.raw("BATCH", `-${batchId}`);
            });

        }



        // receiving 
        kiwi.on('irc.batch start draft/multiline', (batch, network, h) => {
            h.handled = true;
        });
        kiwi.on('irc.message', (message, network, h) => {
            if (!message.batched && message.batch && message.batch.type === 'draft/multiline') {
                log.debug("Got multiline...", message);
                batches[message.batch.id] = message;
                h.handled = true;
            }
            if (message.batched) {
                log.debug("Batched message:", message);
            }
        });
        kiwi.on('irc.batch end draft/multiline', (batch, network, h) => {
            h.handled = true;
            if (!batch.commands.length) return;
            const message = {
                ...batches[batch.id],
                batch,
                message: batch.commands.map(cmd => cmd.params[1] + (cmd?.tags?.["draft/multiline-concat"] !== undefined ? '' : '\n')).join(''),
                tags: {
                    ...batch.tags,
                    batch: undefined
                },
                batched: true
            }
            delete batches[message.batch.id];
            ircClient.parsed_middleware.handle(['message', message, ircClient], function (err) {
                if (err) {
                    console.error(err.stack);
                    return;
                }

                ircClient.emit('message', message);
            });
        })

    });


})