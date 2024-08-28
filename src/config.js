let configBase = 'plugin-emojis';
let defaultConfig = {
    sendNativeEmojis: true,
    imageTitle: 'name', // 'name', 'colons', 'native', ''
    emojiSet: 'google', // 'apple', 'google', 'twitter', 'facebook', 'native'
    pickerProps: {
        emoji: 'point_up',
        title: '',
        perLine: 8,
    },
    frequentlyUsedList: undefined,
    frequentlyUsedLength: 16,
    categoryInclude: undefined,
    categoryExclude: undefined,
    customEmojis: [
        {
            name: 'Kiwi IRC',
            short_names: ['kiwiirc'],
            text: '',
            emoticons: [],
            keywords: [],
            imageUrl: 'static/favicon.png',
        },
    ],
};

module.exports.setDefaults = function setDefaults(kiwi) {
    kiwi.setConfigDefaults(configBase, defaultConfig);
}

module.exports.setting = function setting(name) {
    return kiwi.state.setting([configBase, name].join('.'));
}

module.exports.getSetting = function getSetting(name) {
    return kiwi.state.getSetting(['settings', configBase, name].join('.'));
}

module.exports.setSetting = function setSetting(name, value) {
    return kiwi.state.setSetting(['settings', configBase, name].join('.'), value);
}