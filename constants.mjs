const CONSTANTS = {
    MAX_TEXT_LENGTH: 2000,
    MAX_BLOCKS: 100,
    MAX_BLOCKS_REQEST: 1000,
    MAX_CHILD_ARRAY_DEPTH: 2,
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
    }
}

export default CONSTANTS