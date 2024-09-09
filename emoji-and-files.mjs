import { isSingleEmoji, isValidURL, validateImageURL } from "./utils.mjs"

/**
 * 
 * @param {string} value - either an emoji character or a URL for an externally-hosted image file. 
 * @returns {Object} - An object representing the icon.
 */
export function setIcon(value) {
    if (typeof value !== "string") {
        return {}
    }
    
    const isEmoji = isSingleEmoji(value)
    const isImageURL = validateImageURL(value)

    if (isImageURL) {
        return createExternal(value)
    } else if (isEmoji) {
        return createEmoji(value)
    } else {
        return undefined
    }
}

/**
 * Creates a representation of an external link.
 * 
 * @param {string} url - The URL of the external link.
 * @returns {Object} An object containing the external URL.
 */
export function createExternal(url) {
    return {
        type: "external",
        external: {
            url: url
        }
    }
}

/**
 * Creates a representation of an emoji.
 * 
 * @param {string} emoji - The emoji character.
 * @returns {Object} An object containing the emoji.
 */
export function createEmoji(emoji) {
    return {
        type: "emoji",
        emoji: emoji
    }
}

/**
 * Creates a representation of a file link.
 * 
 * @param {string} url - The URL of the file.
 * @returns {Object} An object containing the file URL.
 */
function createFile(url) {
    return {
        type: "file",
        file: {
            url: url
        }
    }
}