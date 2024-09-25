kiwi.plugin('search', async function (kiwi, log) {
    await new Promise((resolve, reject) => kiwi.on('start', async () => {
        resolve();
    }));
    /**
     * 
     * @type { import('../../kiwiirc/src/libs/state/NetworkState').default}
     */
    const network = kiwi.state.getActiveNetwork();
    const addMessage = kiwi.state.addMessage.bind(kiwi.state);
    const _ = require('lodash');
    const AutoComplete = kiwi.require('components/AutoComplete');
    const refInput = {
        template: `   <div
        :class="{
            'kiwi-controlinput--focus': has_focus,
        }"
        class="kiwi-controlinput kiwi-theme-bg ref-input"
    >
        <div class="kiwi-controlinput-inner">
           
            <form
                class="kiwi-controlinput-form"
                @submit.prevent="submitForm"
            >
                <auto-complete
                    v-if="autocomplete_open"
                    ref="autocomplete"
                    :items="autocomplete_items"
                    :filter="autocomplete_filter"
                    :buffer="buffer"
                    @temp="onAutocompleteTemp"
                    @selected="onAutocompleteSelected"
                    @cancel="onAutocompleteCancel"
                />
                <div v-if="showCommandWarning" class="kiwi-controlinput-command-warn">
                    <div>
                        <svg-icon icon="fa-solid fa-triangle-exclamation" />
                        {{ $t('input_not_command') }}
                    </div>
                    <div class="kiwi-controlinput-command-text">
                        {{ $t('input_send_text') }}
                        <input-confirm
                            :flip-connotation="true"
                            @ok="submitForm()"
                            @submit="showCommandWarning = false;"
                        />
                    </div>
                </div>
                <div class="kiwi-controlinput-input-wrap">
                    <irc-input
                        ref="input"
                        :placeholder="placeholder"
                        class="kiwi-controlinput-input"
                        wrap="off"
                        @input="inputUpdate"
                        @keydown="inputKeyDown($event)"
                        @keyup="inputKeyUp($event)"
                        @focus="onAutocompleteCancel"
                        @blur="onAutocompleteCancel"
                    />
                </div>
            </form>
        </div>
    </div>`,
        components: {
            AutoComplete,
        },
        props: ['network', 'buffer', 'channels','placeholder'],
        data() {
            return {
                self: this,
                autocomplete_open: false,
                autocomplete_items: [],
                autocomplete_filter: '',
                // Not filtering through the autocomplete list means that the entire word is put
                // in place when cycling through items. Just as with traditional IRC clients when
                // tabbing through nicks.
                // When filtering through the list, we keep typing more of the word we want as the
                // autocomplete list filters its results to show us the relevant items, not replacing
                // the current word until we select an item.
                autocomplete_filtering: true,

                current_input_value: '',
                has_focus: false,
                keep_focus: false,
            };
        },
        computed: {

        },
        watch: {
            autocomplete_open(n, v) {
                if (n && this.$parent.$refs.inputs instanceof Array) {
                    this.$parent.inputs.forEach(input => {
                        input !== this && (input.autocomplete_open = false);
                    });
                }
            },
            buffer() {


                this.autocomplete_open = false;
            },
        },
        created() {
            this.typingTimer = null;
            this.lastTypingTime = 0;

        },
        mounted() {
            this.inputRestore();
        },
        methods: {
            inputUpdate(val) {
                this.current_input_value = val;

                // if (this.$state.setting('buffers.shared_input')) {
                //     this.$state.ui.current_input = val;
                // } else {
                //     this.buffer.current_input = val;
                // }

                // Clear the command warning on any new input
                this.showCommandWarning = false;
            },
            inputRestore() {
                let currentInput = this.$state.setting('buffers.shared_input') ?
                    this.$state.ui.current_input :
                    this.buffer.current_input;

                this.$refs.input.reset(currentInput, this.keep_focus);
                this.$refs.input.selectionToEnd();
            },


            onAutocompleteCancel() {
                // this.autocomplete_open = false;
            },
            onAutocompleteTemp(selectedValue, selectedItem) {
                if (!this.autocomplete_filtering) {
                    this.$refs.input.setCurrentWord(selectedValue);
                }
            },
            onAutocompleteSelected(selectedValue, selectedItem) {
                let word = selectedValue;
                if (word.length > 0) {
                    this.$refs.input.setCurrentWord(word);
                }
                this.autocomplete_open = false;
            },
            inputKeyDown(event) {
                let meta = false;

                if (navigator.appVersion.indexOf('Mac') !== -1) {
                    meta = event.metaKey;
                } else {
                    meta = event.ctrlKey;
                }

                // If autocomplete has handled the event, don't also handle it here
                if (this.autocomplete_open && this.$refs.autocomplete.handleOnKeyDown(event)) {
                    return;
                }

                // When not filtering, select the current autocomplete item so that we can type any
                // character directly after a nick
                if (this.autocomplete_open && !this.autocomplete_filtering) {
                    this.$refs.autocomplete.selectCurrentItem();
                }

                if (event.key === 'Enter' && (
                    (event.altKey && !event.shiftKey && !event.metaKey && !event.ctrlKey) ||
                    (event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey)
                )) {
                    // Add new line when shift+enter or alt+enter is pressed
                    event.preventDefault();
                    this.$refs.input.insertText('\n');
                } else if (event.key === 'Enter') {
                    // Send message when enter is pressed
                    event.preventDefault();
                    this.submitForm();
                } else if (event.key === 'Escape' && this.showCommandWarning) {
                    // Close command warning if the user presses escape
                } else if (
                    event.key === 'Tab'
                    && !event.shiftKey
                    && !event.altKey
                    && !event.metaKey
                    && !event.ctrlKey
                ) {
                    // Tab and no other keys as tab+other is often a keyboard shortcut
                    // Tab key was just pressed, start general auto completion
                    let currentWord = this.$refs.input.getCurrentWord();
                    let currentToken = currentWord.word.substr(0, currentWord.position);
                    let inputText = this.$refs.input.getRawText();

                    let items = [];
                    if (inputText.indexOf('/set') === 0) {
                        items = this.buildAutoCompleteItems({ settings: true });
                    } else {
                        items = this.buildAutoCompleteItems({
                            users: true,
                            buffers: true,
                        });
                    }

                    this.openAutoComplete(items);
                    this.autocomplete_filter = currentToken;

                    // Disable filtering so that tabbing cycles through words more like
                    // traditional IRC clients.
                    this.autocomplete_filtering = false;
                    event.preventDefault();
                } else if (meta && event.key === 'k') {
                    // meta + k
                    event.preventDefault();
                }
            },
            inputKeyUp(event) {
                let inputVal = this.$refs.input.getRawText();
                let currentWord = this.$refs.input.getCurrentWord();
                let currentToken = currentWord.word.substr(0, currentWord.position);
                let autocompleteTokens = this.$state.setting('autocompleteTokens');

                if (event.key === 'Escape' && this.autocomplete_open) {
                    this.autocomplete_open = false;
                } else if (this.autocomplete_open && currentToken === '') {
                    this.autocomplete_open = false;
                } else if (this.autocomplete_open) {
                    // @ is a shortcut to open the nicklist autocomplete. It's not part
                    // of the nick so strip it out before passing currentToken to the
                    // filter.
                    if (currentToken[0] === '@') {
                        currentToken = currentToken.substr(1);
                    }
                } else if (currentToken === '@' && autocompleteTokens.includes('@')) {
                    // Just typed @ so start the nick auto completion
                    this.openAutoComplete(this.buildAutoCompleteItems({ users: true }));
                    this.autocomplete_filtering = true;
                } else if (currentToken === '#' && autocompleteTokens.includes('#')) {
                    // Just typed # so start the command auto completion
                    this.openAutoComplete(this.buildAutoCompleteItems({ buffers: true }));
                    this.autocomplete_filtering = true;
                }
                else if (currentToken === '&' && autocompleteTokens.includes('&')) {
                    // Just typed # so start the command auto completion
                    this.openAutoComplete(this.buildAutoCompleteItems({ buffers: true }));
                    this.autocomplete_filtering = true;
                } else if (
                    event.key === 'Tab'
                    && !event.shiftKey
                    && !event.altKey
                    && !event.metaKey
                    && !event.ctrlKey
                ) {
                    // Tab and no other keys as tab+other is often a keyboard shortcut
                    event.preventDefault();
                } else if (!event.key.match(/^(Shift|Control|Alt|Enter)/)) {
                    if (inputVal[0] === '/') {
                        // Don't send typing status for commands
                        return;
                    }


                }

                if (this.autocomplete_open && this.autocomplete_filtering) {
                    this.autocomplete_filter = currentToken;
                }
            },
            submitForm() {


            },

            openAutoComplete(items) {
                if (this.$state.setting('showAutocomplete')) {
                    this.autocomplete_items = items;
                    this.autocomplete_open = true;
                }
            },
            buildAutoCompleteItems(_opts) {
                let opts = _opts || {};
                let list = [];



                if (opts.buffers && this.channels !== false) {
                    let bufferList = [];
                    this.network.buffers.forEach((buffer) => {
                        if (buffer.isChannel()) {
                            bufferList.push({
                                text: buffer.name,
                                type: 'buffer',
                            });
                        }
                    });

                    list = list.concat(bufferList);
                }
                if (opts.users) {
                    let userList = _.values(this.network.users).map((user) => {
                        let item = {
                            text: user.nick,
                            type: 'user',
                        };
                        return item;
                    });

                    list = list.concat(userList);
                }
                return list;
            },

        },
    }
    kiwi.addUi('buffer.special.controls.search', {
        template: `
        <div class="kiwi-searchinput-controls u-form">
    <div class="control-group query">

        <div class="control">
            <input class="u-input" name="query" type="text" placeholder="Search...">
        </div>
        <div class="control">
        <div v-show="loading" class="search-loading">
            <svg-spinner />
        </div>
            <div class="button-group">
                <button
                    @click="advancedSettings = !advancedSettings" 
                    class="u-button u-button-primary advanced-settings">
                    <svg-icon icon="cog"/>
                </button>
                <button class="u-button u-button-primary go">
                    <svg-icon icon="magnifying-glass"/>
                    Go
                </button>
            </div>
        </div>
    </div>
    <div class="control-group" v-if="advancedSettings">

        <div class="control">
            <label for="before">Before:</label>
            <input class="u-input" name="before" type="datetime-local">
        </div>
        <div class="control">
            <label for="after">After:</label>
            <input class="u-input" name="after" type="datetime-local">
        </div>
        <div class="control">
            <label for="in">In:</label>
            <ref-input
                ref="inputs"
                :network="network"
                :buffer="buffer"
                class="u-input" 
                name="in" 
                type="text" 
                placeholder="#chan"
            />
        </div>
        <div class="control">
            <label for="from">From:</label>
            <ref-input 
                ref="inputs"
                :network="network"
                :buffer="buffer"
                class="u-input"
                :channels="false"
                name="from" 
                type="text" 
                placeholder="nick"
            />
        </div>
    </div>
</div>`,
        components: {
            RefInput: refInput
        },
        data() {
            return {
                advancedSettings: false,
                loading: false
            }
        },
        props: ['buffer', 'network']
    })
    kiwi.state.addMessage = function (buffer, message) {
        if (message?.batch?.type === 'search') {
            buffer = searchBuffer;
            message.time = -1;
        }
        log.debug("adding message", buffer, message)
        return addMessage(buffer, message);
    };
    const addBuffer = kiwi.state.addBuffer.bind(kiwi.state);
    kiwi.state.addBuffer = function (networkid, bufferName) {
        const buf = addBuffer(networkid, bufferName);
        if (buf.name === '*search') {
            buf.show_input = false;
        }
        return buf;
    };
    const searchBuffer = kiwi.state.getOrAddBufferByName(network.id, '*search');

})