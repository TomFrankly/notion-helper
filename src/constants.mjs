const CONSTANTS = {
    MAX_TEXT_LENGTH: 2000,
    MAX_MENTION_LENGTH: 2000,
    MAX_BLOCKS: 100,
    MAX_BLOCKS_REQUEST: 999,
    MAX_CHILD_ARRAY_DEPTH: 2,
    MAX_PAYLOAD_SIZE: 450000, // 450kb
    MAX_EQUATION_LENGTH: 1000,
    MAX_URL_LENGTH: 2000,
    MAX_PHONE_NUMBER_LENGTH: 200,
    MAX_EMAIL_LENGTH: 200,
    MAX_MULTI_SELECT_COUNT: 100,
    MAX_RELATION_COUNT: 100,
    MAX_PEOPLE_COUNT: 100,
    IMAGE_SUPPORT: {
        FORMATS: [
            'bmp', 'gif', 'heic', 'jpeg', 'jpg', 'png', 'svg', 'tif', 'tiff'
        ]
    },
    VIDEO_SUPPORT: {
        FORMATS: [
            'amv', 'asf', 'avi', 'f4v', 'flv', 'gifv', 'mkv', 'mov', 'mpg', 'mpeg', 'mpv', 'mp4', 'm4v', 'qt', 'wmv'
        ],
        SITES: [
            'youtube.com'
        ]
    },
    AUDIO_SUPPORT: {
        FORMATS: [
            'mp3', 'wav', 'ogg', 'mid', 'midi', 'wma', 'aac', 'm4a', 'm4b'
        ],
    },
    DOCUMENT_SUPPORT: {
        FORMATS: [
            'pdf', 'json', 'txt'
        ],
    },
}

export default CONSTANTS