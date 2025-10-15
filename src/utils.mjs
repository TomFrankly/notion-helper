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
    validateStringLength({ string, type: "url" });
    
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
 * Checks string length against the max length and throws a warning if it is over the limit.
 * @param {Object} options - the options for the function
 * @param {string} options.string - the string to be checked
 * @param {string} options.type - the type of string to be checked (text, equation, url, email, phone_number)
 * @param {number} options.limit - the max length of the string
 * @returns {void}
 */
export function validateStringLength({ string, type, limit }) {
    
    if (typeof string !== "string") {
        console.warn(`Invalid input sent to validateStringLength(). Expected a string, got: ${typeof string}. String: ${string}. Type: ${type}. Limit: ${limit}.`);
        return;
    }

    let resolvedLimit = limit;

    if (typeof resolvedLimit !== "number" || resolvedLimit <= 0) {
        switch (type) {
            case "text":
                resolvedLimit = CONSTANTS.MAX_TEXT_LENGTH;
                break;
            case "mention":
                resolvedLimit = CONSTANTS.MAX_MENTION_LENGTH;
                break;
            case "equation":
                resolvedLimit = CONSTANTS.MAX_EQUATION_LENGTH;
                break;
            case "url":
                resolvedLimit = CONSTANTS.MAX_URL_LENGTH;
                break;
            case "email":
                resolvedLimit = CONSTANTS.MAX_EMAIL_LENGTH;
                break;
            case "phone_number":
                resolvedLimit = CONSTANTS.MAX_PHONE_NUMBER_LENGTH;
                break;
            default:
                resolvedLimit = undefined;
        }
    }

    if (typeof resolvedLimit === "number" && string.length > resolvedLimit) {
        const displayString = string.length > 500 ? string.slice(0, 500) + '...[truncated]' : string;
        console.warn(`String length is over the limit. String length: ${string.length}, Max length: ${resolvedLimit}. String: ${displayString}. Type: ${type}.`);
    }
}

/**
 * Checks array length against the max length and throws a warning if it is over the limit.
 * @param {Object} options - the options for the function
 * @param {Array} options.array - the array to be checked
 * @param {string} options.type - the type of array to be checked (relation, multi_select, people)
 * @param {number} options.limit - the max length of the array
 * @returns {void}
 */
export function validateArrayLength({ array, type, limit }) {
    
    if (!Array.isArray(array)) {
        console.warn(`Invalid input sent to validateArrayLength(). Expected an array, got: ${typeof array}. Array: ${array}. Type: ${type}. Limit: ${limit}.`);
        return;
    }

    let resolvedLimit = limit;

    if (typeof resolvedLimit !== "number" || resolvedLimit <= 0) {
        switch (type) {
            case "relation":
                resolvedLimit = CONSTANTS.MAX_RELATION_COUNT;
                break;
            case "multi_select":
                resolvedLimit = CONSTANTS.MAX_MULTI_SELECT_COUNT;
                break;
            case "people":
                resolvedLimit = CONSTANTS.MAX_PEOPLE_COUNT;
                break;
            default:
                resolvedLimit = undefined;
        }
    }

    if (typeof resolvedLimit === "number" && array.length > resolvedLimit) {
        const displayArray = array.length > 10 ? array.slice(0, 10) + '...[truncated]' : array;
        console.warn(`Array length is over the limit. Array length: ${array.length}, Max length: ${resolvedLimit}. Array: ${displayArray}. Type: ${type}.`);
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
 * Validates a Date object or string input that represents a date, and converts it to an ISO-8601 date string if possible.
 *
 * If the input is a string without time information, returns just the date (YYYY-MM-DD).
 * If the input is a Date object or a string with time info, returns full ISO string.
 * Returns null if the input is invalid.
 * 
 * @param {(string|Date)} dateInput - A Date object or string representing a date 
 * @returns {string|null} ISO-8601 date string, or null if input is invalid
 *
 * @example
 * // Returns "2023-12-01"
 * validateDate("2023-12-01")
 *
 * // Returns "2023-12-01T15:30:00.000Z"
 * validateDate("2023-12-01T15:30:00Z")
 * 
 * // Returns "2023-12-01T00:00:00.000Z"
 * validateDate(new Date("2023-12-01"))
 * 
 * // Handles non-ISO date strings, Returns "2023-09-10T00:00:00.000Z" (browser timezone may affect result)
 * validateDate("September 10, 2023")
 * 
 * // Handles other common formats, Returns "2023-07-04T00:00:00.000Z"
 * validateDate("07/04/2023")
 * 
 * // Returns null (invalid input)
 * validateDate("not a date")
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

/**
 * Validates a well-formed Notion block and splits it into multiple blocks if needed.
 * 
 * This function performs validation and splitting for different types of rich text content:
 * 1. Main rich_text arrays (paragraph, heading, etc.) - splits individual objects and handles MAX_BLOCKS limit
 * 2. Caption arrays (image, video, audio, file, pdf, code blocks) - splits individual objects but doesn't duplicate blocks
 * 
 * For blocks with main rich_text arrays, if the resulting array exceeds MAX_BLOCKS (100), 
 * the function splits into multiple blocks of the same type. Children are preserved only 
 * for the first split block to avoid duplication. For blocks with captions, only the caption 
 * rich text objects are processed without duplicating the block. If a caption array exceeds 
 * MAX_BLOCKS after processing, it is truncated to the first 100 objects with a console warning.
 * 
 * @param {Object} block - A well-formed Notion block object
 * @param {number} [limit] - Optional custom limit for text length. If not provided, uses CONSTANTS.MAX_TEXT_LENGTH
 * @returns {Array<Object>} - Array containing the original block if valid, or multiple blocks if split was necessary
 * 
 * @example
 * // Block with short text - returns original block
 * const shortBlock = {
 *   type: "paragraph",
 *   paragraph: {
 *     rich_text: [{ type: "text", text: { content: "Short text" } }]
 *   }
 * };
 * const result1 = validateAndSplitBlock(shortBlock);
 * // Returns: [shortBlock]
 * 
 * // Block with long text in single rich text object - splits the rich text object
 * const longBlock = {
 *   type: "paragraph", 
 *   paragraph: {
 *     rich_text: [{ type: "text", text: { content: "Very long text that exceeds the limit..." } }],
 *     color: "blue"
 *   }
 * };
 * const result2 = validateAndSplitBlock(longBlock);
 * // Returns: [block] with multiple rich text objects in the rich_text array
 * 
 * // Image block with long caption - processes caption without duplicating block
 * const imageBlock = {
 *   type: "image",
 *   image: {
 *     type: "external",
 *     external: { url: "https://example.com/image.jpg" },
 *     caption: [{ type: "text", text: { content: "Very long caption..." } }]
 *   }
 * };
 * const result3 = validateAndSplitBlock(imageBlock);
 * // Returns: [imageBlock] with processed caption rich text
 * 
 * // Heading block with children - children preserved only in first split block
 * const headingWithChildren = {
 *   type: "heading_1",
 *   heading_1: {
 *     rich_text: Array(150).fill().map((_, i) => ({ 
 *       type: "text", 
 *       text: { content: `Heading text ${i}` } 
 *     })),
 *     children: [{ type: "paragraph", paragraph: { rich_text: [] } }] // 100 child blocks
 *   }
 * };
 * const result4 = validateAndSplitBlock(headingWithChildren);
 * // Returns: [heading1, heading2] where only heading1 has children
 * 
 * // Image block with too many caption objects - truncates and warns
 * const imageWithManyCaptions = {
 *   type: "image",
 *   image: {
 *     type: "external",
 *     external: { url: "https://example.com/image.jpg" },
 *     caption: Array(150).fill().map((_, i) => ({ 
 *       type: "text", 
 *       text: { content: `Caption ${i}` } 
 *     }))
 *   }
 * };
 * const result4 = validateAndSplitBlock(imageWithManyCaptions);
 * // Returns: [imageBlock] with caption truncated to first 100 objects + console warning
 */
export function validateAndSplitBlock(block, limit) {
    if (!block || typeof block !== "object") {
        console.warn(`Invalid input sent to validateAndSplitBlock(). Expected a Notion block object, got: ${typeof block}. Block: ${block}.`);
        return [];
    }

    if (!block.type) {
        console.warn(`Invalid Notion block: missing 'type' property. Block: ${JSON.stringify(block)}.`);
        return [];
    }

    const blockContent = block[block.type];
    if (!blockContent) {
        return [block];
    }

    function processRichTextArray(richTextArray, textLimit = limit) {
        const processedRichText = [];
        
        for (const richTextItem of richTextArray) {
            if (richTextItem.type === "text" && richTextItem.text && richTextItem.text.content) {
                const textChunks = enforceStringLength(richTextItem.text.content, textLimit);
                
                for (const chunk of textChunks) {
                    processedRichText.push({
                        ...richTextItem,
                        text: {
                            ...richTextItem.text,
                            content: chunk
                        }
                    });
                }
            } else if (richTextItem.type === "equation" && richTextItem.equation && richTextItem.equation.expression) {
                const equationChunks = enforceStringLength(richTextItem.equation.expression, CONSTANTS.MAX_EQUATION_LENGTH);
                
                for (const chunk of equationChunks) {
                    processedRichText.push({
                        ...richTextItem,
                        equation: {
                            ...richTextItem.equation,
                            expression: chunk
                        }
                    });
                }
            } else {
                processedRichText.push(richTextItem);
            }
        }
        
        return processedRichText;
    }

    if (blockContent.rich_text) {
        const processedRichText = processRichTextArray(blockContent.rich_text);

        if (processedRichText.length <= CONSTANTS.MAX_BLOCKS) {
            return [{
                ...block,
                [block.type]: {
                    ...blockContent,
                    rich_text: processedRichText
                }
            }];
        }

        const splitBlocks = [];
        const chunkSize = CONSTANTS.MAX_BLOCKS;
        
        for (let i = 0; i < processedRichText.length; i += chunkSize) {
            const richTextChunk = processedRichText.slice(i, i + chunkSize);
            const isFirstBlock = i === 0;
            
            const newBlock = {
                type: block.type,
                [block.type]: {
                    ...blockContent,
                    rich_text: richTextChunk
                }
            };

            if (blockContent.color) {
                newBlock[block.type].color = blockContent.color;
            }
            
            if (isFirstBlock && blockContent.children) {
                newBlock[block.type].children = blockContent.children;
            }

            splitBlocks.push(newBlock);
        }

        console.info(`Block split into ${splitBlocks.length} blocks due to rich text array exceeding MAX_BLOCKS limit. Original rich text count: ${blockContent.rich_text.length}, Processed count: ${processedRichText.length}.`);
        
        return splitBlocks;
    }

    const captionBlockTypes = ['image', 'video', 'audio', 'file', 'pdf', 'code'];
    if (captionBlockTypes.includes(block.type) && blockContent.caption) {
        const processedCaption = processRichTextArray(blockContent.caption);
        
        if (processedCaption.length > CONSTANTS.MAX_BLOCKS) {
            const truncatedCaption = processedCaption.slice(0, CONSTANTS.MAX_BLOCKS);
            
            let previewText = "";
            if (processedCaption[0] && processedCaption[0].type === "text" && processedCaption[0].text && processedCaption[0].text.content) {
                previewText = processedCaption[0].text.content;
            } else if (processedCaption[0] && processedCaption[0].type === "equation" && processedCaption[0].equation && processedCaption[0].equation.expression) {
                previewText = processedCaption[0].equation.expression;
            }
            
            const displayText = previewText.length > 500 ? previewText.slice(0, 500) + '...[truncated]' : previewText;
            
            console.warn(`Caption array exceeded MAX_BLOCKS limit (${CONSTANTS.MAX_BLOCKS}). Truncated from ${processedCaption.length} to ${CONSTANTS.MAX_BLOCKS} rich text objects. Block type: ${block.type}. Preview: ${displayText}`);
            
            return [{
                ...block,
                [block.type]: {
                    ...blockContent,
                    caption: truncatedCaption
                }
            }];
        }
        
        return [{
            ...block,
            [block.type]: {
                ...blockContent,
                caption: processedCaption
            }
        }];
    }

    return [block];
}

