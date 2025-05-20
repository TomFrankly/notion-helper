import CONSTANTS from "./constants.mjs";

/**
 * Checks if a string contains only a single emoji.
 * 
 * @param {string} string 
 * @returns {boolean}
 */
export function isSingleEmoji(string) {
    const trimmedString = string.trim()
    const regex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\p{Emoji_Modifier})?$/u;
    return regex.test(trimmedString);
}

/**
 * Checks if a string is a valid URL.
 * 
 * @param {string} string 
 * @returns {boolean}
 */
export function isValidURL(string) {
    try {
        const url = new URL(string);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch (e) {
        return false;
    }
}

/**
 * Checks if a string is a valid UUID.
 * 
 * @param {string} string 
 * @returns {boolean}
 */
export function isValidUUID(string) {
    const regex = /^[0-9a-fA-F]{8}(-?[0-9a-fA-F]{4}){3}-?[0-9a-fA-F]{12}$/;
    return regex.test(string);
}

/**
 * Checks if an image URL is both a valid URL and has a supported image file type.
 * 
 * @param {url} url - the URL to be checked 
 * @returns {boolean}
 */
export function validateImageURL(url) {
    try {
        const supportedFormats = CONSTANTS.IMAGE_SUPPORT.FORMATS.join("|");
        const formatRegex = new RegExp(`\\.(${supportedFormats})$`, 'i');
        return formatRegex.test(url) && isValidURL(url);
    } catch (e) {
        console.error(`${url} is not a valid image URL.`)
        return false;
    }
}

/**
 * Checks if a video URL is both a valid URL and will be accepted by the API, based on a list of supported file extensions and embed websites.
 * 
 * @param {url} url - the URL to be checked 
 * @returns {boolean}
 */
export function validateVideoURL(url) {
    try {
        const supportedFormats = CONSTANTS.VIDEO_SUPPORT.FORMATS.join("|");
        const formatRegex = new RegExp(`\\.(${supportedFormats})$`, 'i');
        const supportedSites = CONSTANTS.VIDEO_SUPPORT.SITES.join("|");
        const siteRegex = new RegExp(`(${supportedSites})`, 'i');
        return (
            (formatRegex.test(url) || siteRegex.test(url)) && isValidURL(url)
        );
    } catch (e) {
        return false;
    }
}

/**
 * Checks if a audio URL is both a valid URL and will be accepted by the API, based on a list of supported file extensions.
 * 
 * @param {url} url - the URL to be checked 
 * @returns {boolean}
 */
export function validateAudioURL(url) {
    try {
        const supportedFormats = CONSTANTS.AUDIO_SUPPORT.FORMATS.join("|");
        const formatRegex = new RegExp(`\\.(${supportedFormats})$`, 'i');
        return formatRegex.test(url) && isValidURL(url);
    } catch (e) {
        return false;
    }
}

/**
 * Checks if a PDF URL is both a valid URL and ends with the .pdf extension.
 * 
 * @param {url} url - the URL to be checked 
 * @returns {boolean}
 */
export function validatePDFURL(url) {
    try {
        const formatRegex = new RegExp(`\\.pdf$`, 'i');
        return formatRegex.test(url) && isValidURL(url);
    } catch (e) {
        return false;
    }
}

/**
 * Enforces a length limit on a string. Returns the original string in a single-element array if it is under the limit. If not, returns an array with string chunks under the limit.
 *
 * @param {string} string - the string to be tested
 * @param {number} limit - optional string-length limit
 * @returns {Array<string>} - array with the original string, or chunks of the string if it was over the limit.
 */
export function enforceStringLength(string, limit) {
    if (typeof string !== "string") {
        console.error(
            "Invalid input sent to enforceStringLength(). Expected a string, got: ",
            string,
            typeof string
        );
        throw new Error("Invalid input: Expected a string.");
    }

    const charLimit = CONSTANTS.MAX_TEXT_LENGTH;
    const softLimit = limit && limit > 0 ? limit : charLimit * 0.8;

    if (string.length < charLimit) {
        return [string];
    } else {
        let chunks = [];
        let currentIndex = 0;

        while (currentIndex < string.length) {
            let nextCutIndex = Math.min(
                currentIndex + softLimit,
                string.length
            );

            let nextSpaceIndex = string.indexOf(" ", nextCutIndex);

            if (
                nextSpaceIndex === -1 ||
                nextSpaceIndex - currentIndex > softLimit
            ) {
                nextSpaceIndex = nextCutIndex;
            }

            // Don't split high-surrogate characters
            while (
                nextSpaceIndex > 0 &&
                string.charCodeAt(nextSpaceIndex - 1) >= 0xd800 &&
                string.charCodeAt(nextSpaceIndex - 1) <= 0xdbff
            ) {
                nextSpaceIndex--;
            }

            chunks.push(string.substring(currentIndex, nextSpaceIndex));
            currentIndex = nextSpaceIndex + 1;
        }

        return chunks;
    }
}

/**
 * Validates Date object or string input that represents a date, and converts it to an ISO-8601 date string if possible.
 * 
 * @param {(string|Date)} date - a Date object or string representing a date 
 * @returns {string}
 */
export function validateDate(dateInput) {
    let date

    if (dateInput === null) {
        return null
    }

    if (dateInput instanceof Date) {
        date = dateInput
    }

    else if (typeof dateInput === 'string') {
        date = new Date(dateInput)
    }

    else {
        console.warn(`Invalid input: Expected a Date object or string representing a date. Returning null.`)
        return null
    }

    if (!isNaN(date.getTime())) {
        const isoString = date.toISOString()

        if (typeof dateInput === 'string' && !dateInput.includes(':') && !dateInput.includes('T')) {
            return isoString.split('T')[0]
        } else {
            return isoString
        }
    } else {
        console.warn(`Invalid date string or Date object provided. Returning null.`)
        return null
    }
}

/**
 * Checks a provided array of child blocks to see how many nested levels of child blocks are present. Used by requests.blocks.children.append to determine if recursive calls need to be used.
 * 
 * @param {Array<Object>} arr - The array of child blocks to be depth-checked.
 * @param {number} [level = 1] - The current level.
 * 
 * @returns {number}
 */
export function getDepth(arr, level = 0) {
    if (!Array.isArray(arr) || arr.length === 0) {
        return level
    }

    let maxDepth = level

    for (let block of arr) {
        if (block[block.type].children) {
            const depth = getDepth(block[block.type].children, level + 1)
            maxDepth = Math.max(maxDepth, depth)
        }
    }

    return maxDepth
}

/**
 * Gets the total number of blocks within an array of child blocks, including
 * child blocks of those blocks (and so on). Used to ensure that requests
 * do not exceed the 1,000 total block limit of the Notion API.
 * 
 * @param {Array<Object>} arr - The array of block objects to be counted.
 * @returns {number}
 */
export function getTotalCount(arr) {
    if (!arr || arr?.length === 0) return 0

    return arr.reduce(
        (acc, child) => {
            if(child[child.type].children) {
                return (
                    acc + 1 + getTotalCount(child[child.type].children)
                )
            }
            return acc
        }, 0
    )
}

/**
 * Gets the length of the longest array within a nested block array.
 * 
 * @param {Array<Object>} arr - The array to check
 * @param {number} count - The length of the array one level up from the array being checked, or 0 if this is the initial call of the function
 * @returns {number}
 */
export function getLongestArray(arr, count = 0) {
    if (!Array.isArray(arr) || arr.length === 0) {
        return count
    }

    let maxLength = Math.max(count, arr.length)

    for (let block of arr) {
        if (block[block.type].children) {
            const count = getLongestArray(block[block.type].children, maxLength)
            maxLength = Math.max(count, maxLength)
        }
    }

    return maxLength
}

/**
 * Gets the size in bytes of a block array when converted to JSON.
 * Used to ensure API requests don't exceed Notion's payload size limits.
 * 
 * @param {Array<Object>} arr - The array of block objects to measure
 * @returns {number} Size in bytes
 */
export function getPayloadSize(arr) {
    if (!arr || !Array.isArray(arr)) return 0;
    
    const size = arr.reduce((acc, block) => {
        return acc + new TextEncoder().encode(JSON.stringify(block)).length;
    }, 0);
    
    return size;
}