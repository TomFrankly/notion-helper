import CONSTANTS from "./constants.mjs"

export function isSingleEmoji(string) {
    const regex = /^\p{Emoji}$/u
    return regex.test(string.trim())
}

export function isValidURL(string) {
    try {
        const url = new URL(string)
        return url.protocol === 'http:' || url.protocol === 'https:'
    } catch (e) {
        return false
    }
}

export function validateImageURL(url) {
    try {
        const supportedFormats = CONSTANTS.IMAGE_SUPPORT.FORMATS.join("|")
        const formatRegex = new RegExp(`\\.(${supportedFormats})$`, i)
        return formatRegex.test(url) && isValidURL(url)
    } catch (e) {
        return false
    }
}

export function validateVideoURL(url) {
    try {
        const supportedFormats = CONSTANTS.VIDEO_SUPPORT.FORMATS.join("|")
        const formatRegex = new RegExp(`\\.(${supportedFormats})$`, i)
        const supportedSites = CONSTANTS.VIDEO_SUPPORT.SITES.join("|")
        const siteRegex = new RegExp(`(${supportedSites})`, i)
        return (formatRegex.test(url) || siteRegex.test(url)) && isValidURL(url)
    } catch (e) {
        return false
    }
}

export function validatePDFURL(url) {
    try {
        const formatRegex = new RegExp(`\\.pdf$`, i)
        return formatRegex.test(url) && isValidURL(url)
    } catch (e) {
        return false
    }
}