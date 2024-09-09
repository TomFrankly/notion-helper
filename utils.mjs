import CONSTANTS from "./constants.mjs";

/**
 * Checks if a string contains only a single emoji.
 * 
 * @param {string} string 
 * @returns {boolean}
 */
export function isSingleEmoji(string) {
    const regex = /^\p{Emoji}$/u;
    return regex.test(string.trim());
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
 * Checks if an image URL is both a valid URL and has a supported image file type.
 * 
 * @param {url} url - the URL to be checked 
 * @returns {boolean}
 */
export function validateImageURL(url) {
    try {
        const supportedFormats = CONSTANTS.IMAGE_SUPPORT.FORMATS.join("|");
        const formatRegex = new RegExp(`\\.(${supportedFormats})$`, i);
        return formatRegex.test(url) && isValidURL(url);
    } catch (e) {
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
        const formatRegex = new RegExp(`\\.(${supportedFormats})$`, i);
        const supportedSites = CONSTANTS.VIDEO_SUPPORT.SITES.join("|");
        const siteRegex = new RegExp(`(${supportedSites})`, i);
        return (
            (formatRegex.test(url) || siteRegex.test(url)) && isValidURL(url)
        );
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
        const formatRegex = new RegExp(`\\.pdf$`, i);
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