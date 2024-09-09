/**
 * Builds a Rich Text Object. See: https://developers.notion.com/reference/rich-text
 * @param {string} text - The text content.
 * @param {Object} opts - Options for the Annotation object.
 * @param {boolean} opts.bold - Bold text
 * @param {boolean} opts.italic - Italic text
 * @param {boolean} opts.strikethrough - Strikethrough text
 * @param {boolean} opts.underline - Underlined text
 * @param {boolean} opts.code - Code-style text
 * @param {string} opts.color - String specifying the text's color or background color. Opts: "blue", "brown", "default", "gray", "green", "orange", "pink", "purple", "red", "yellow". All except "default" can also be used as a background color with "[color]_background" - example: "blue_background". See: https://developers.notion.com/reference/rich-text#the-annotation-object
 * @param {string} url - The URL for this object, if any. Creates a clickable link.
 * @returns {Array<Object>} - Array with a single Rich Text Object
 */
export function buildRichTextObj(text, opts, url, type = "text") {
    return [
        {
            type: type,
            text: {
                content: text,
                ...(url &&
                    url.length > 0 && {
                        link: {
                            url: url,
                        },
                    }),
            },
            annotations: { ...opts },
        },
    ];
}
