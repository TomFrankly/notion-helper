import { buildRichTextObj } from "./rich-text.mjs";
import CONSTANTS from "./constants.mjs";
import { setIcon } from "./emoji-and-files.mjs";
import {
    isValidURL,
    validateImageURL,
    validatePDFURL,
    validateVideoURL,
} from "./utils.mjs";

/*
 * TODO
 *
 * - Create a wrapper class that can give blocks internal labels. Will be useful for appending child block arrays to specific blocks, and editing blocks after creation but before they are sent to Notion
 * - Remove undefined blocks from children arrays before making calls
 */

export function makeParagraphs(strings) {
    if (!Array.isArray(strings) || strings.length < 1) {
        console.error(`Invalid argument passed to makeParagraphs(). Expected a non-empty array.`)
        console.dir(strings)
        throw new Error(`Invalid argument: Expected a non-empty array.`)
    }
    
    const lengthCheckedStrings = "" // Fix
}

/*
 * Object with methods to construct the majority of block types supported by the Notion API.
 *
 * Block types include bookmark, bulleted list item, callout, code, divider, embed, file, heading, image, numbered list item, paragraph, pdf, quote, table, table row, table of contents, to-do, toggle, and video. Some block types return null if they are provided with invalid data; you should filter these out your final children array.
 *
 * Not implemented: Breadcrumb, column list, column, equation, link preview (unsupported), mention, synced block (unsupported)
 *
 * @type {Object}
 */
export const block = {
    /**
     * Methods to create bookmark blocks.
     * Does not check for URL validity.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks.
     * @method createBlock
     * @param {Object} options
     * @param {string} options.url - The URL to be bookmarked.
     * @param {Array} [options.rtArray=[]] - An array of rich text items for the caption.
     * @returns {Object} A bookmark block object.
     */
    bookmark: {
        supports_children: false,
        createBlock: ({ url, rtArray = [] }) => ({
            type: "bookmark",
            bookmark: {
                caption: rtArray,
                url: url,
            },
        }),
    },

    /**
     * Methods to create bulleted list item blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks.
     * @method createBlock
     * @param {Object} options
     * @param {Array} [options.rtArray=[]] - An array of rich text items for the content.
     * @param {Array} [options.children=[]] - An array of child block objects.
     * @param {string} [options.color="default"] - Color for the text.
     * @returns {Object} A bulleted list item block object.
     */
    bulleted_list_item: {
        supports_children: true,
        createBlock: ({ rtArray = [], children = [], color = "default" }) => ({
            type: "bulleted_list_item",
            bulleted_list_item: {
                rich_text: rtArray,
                color: color,
                children: children,
            },
        }),
    },

    /**
     * Methods to create callout blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks.
     * @method createBlock
     * @param {Object} options
     * @param {Array} [options.rtArray=[]] - An array of rich text items for the callout.
     * @param {string} [options.icon=""] - An optional icon value (URL for "external" or emoji character for "emoji").
     * @param {Array} [options.children=[]] - An array of child block objects.
     * @param {string} [options.color="default"] - Color for the callout text.
     * @returns {Object} A callout block object.
     */
    callout: {
        supports_children: true,
        createBlock: ({
            rtArray = [],
            icon = "",
            children = [],
            color = "default",
        }) => ({
            type: "callout",
            callout: {
                rich_text: rtArray,
                color: color,
                icon: setIcon(icon),
                children: children,
            },
        }),
    },

    /**
     * Methods to create code blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks (not supported for code).
     * @method createBlock
     * @param {Object} options
     * @param {Array} [options.rtArray=[]] - An array of rich text items for the code content.
     * @param {Array} [options.caption=[]] - An array of rich text items for the caption.
     * @param {string} [options.language="plain text"] - Programming language of the code block.
     * @returns {Object} A code block object.
     */
    code: {
        supports_children: false,
        createBlock: ({
            rtArray = [],
            caption = [],
            language = "plain text",
        }) => ({
            type: "code",
            code: {
                caption: caption,
                rich_text: rtArray,
                language: language,
            },
        }),
    },

    /**
     * Methods to create divider blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks (not supported for dividers).
     * @method createBlock
     * @returns {Object} A divider block object.
     */
    divider: {
        supports_children: false,
        createBlock: () => ({
            type: "divider",
            divider: {},
        }),
    },

    /**
     * Methods to create embed blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks.
     * @method createBlock
     * @param {Object} options
     * @param {string} options.url - The URL to be embedded.
     *
     */
    embed: {
        supports_children: false,
        createBlock: ({ url }) => ({
            type: "embed",
            embed: {
                url: url,
            },
        }),
    },

    /**
     * Methods to create file blocks.
     *
     * Returns null on invalid URL; remove null from the final children array.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks (not supported for files).
     * @method createBlock
     * @param {Object} options
     * @param {string} options.url - The URL for the file.
     * @param {string} options.name - The name of the file.
     * @param {Array} [options.caption=[]] - An array of rich text items for the caption.
     * @returns {Object|null} A file block object or null if the URL is invalid.
     */
    file: {
        // Returns null on invalid URL. Remove null from final children array.
        supports_children: false,
        createBlock: ({ url, name, caption = [] }) => {
            const isValid = isValidURL(url);
            return isValid
                ? {
                      type: "file",
                      file: {
                          type: "external",
                          external: {
                              url: url,
                          },
                          caption: caption,
                          name: name && name !== "" ? name : undefined,
                      },
                  }
                : null;
        },
    },

    /**
     * Methods to create heading_1 blocks.
     *
     * Adding children will coerce headings to toggle headings.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks.
     * @method createBlock
     * @param {Object} options
     * @param {Array} [options.rtArray=[]] - An array of rich text items for the heading text.
     * @param {string} [options.color="default"] - Color for the heading text.
     * @param {boolean} [options.is_toggleable=false] - Whether the heading is toggleable.
     * @param {Array} [options.children=[]] - An array of child block objects.
     * @returns {Object} A heading block object.
     */
    heading_1: {
        supports_children: true,
        createBlock: ({
            rtArray = [],
            color = "default",
            is_toggleable = false,
            children = [],
        }) => ({
            type: "heading_1",
            heading_1: {
                rich_text: rtArray,
                color: color,
                is_toggleable: is_toggleable,
                children: children,
            },
        }),
    },

    /**
     * Methods to create heading_2 blocks.
     *
     * Adding children will coerce headings to toggle headings.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks.
     * @method createBlock
     * @param {Object} options
     * @param {Array} [options.rtArray=[]] - An array of rich text items for the heading text.
     * @param {string} [options.color="default"] - Color for the heading text.
     * @param {boolean} [options.is_toggleable=false] - Whether the heading is toggleable.
     * @param {Array} [options.children=[]] - An array of child block objects.
     * @returns {Object} A heading block object.
     */
    heading_2: {
        supports_children: true,
        createBlock: ({
            rtArray = [],
            color = "default",
            is_toggleable = false,
            children = [],
        }) => ({
            type: "heading_2",
            heading_2: {
                rich_text: rtArray,
                color: color,
                is_toggleable: is_toggleable,
                children: children,
            },
        }),
    },

    /**
     * Methods to create heading_3 blocks.
     *
     * Adding children will coerce headings to toggle headings.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks.
     * @method createBlock
     * @param {Object} options
     * @param {Array} [options.rtArray=[]] - An array of rich text items for the heading text.
     * @param {string} [options.color="default"] - Color for the heading text.
     * @param {boolean} [options.is_toggleable=false] - Whether the heading is toggleable.
     * @param {Array} [options.children=[]] - An array of child block objects.
     * @returns {Object} A heading block object.
     */
    heading_3: {
        supports_children: true,
        createBlock: ({
            rtArray = [],
            color = "default",
            is_toggleable = false,
            children = [],
        }) => ({
            type: "heading_3",
            heading_3: {
                rich_text: rtArray,
                color: color,
                is_toggleable: is_toggleable,
                children: children,
            },
        }),
    },

    /**
     * Methods to create image blocks.
     *
     * Returns null on invalid image URL; remove null from the final children array.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks (not supported for images).
     * @method createBlock
     * @param {Object} options
     * @param {string} options.url - The URL for the image.
     * @returns {Object|null} An image block object or null if the URL is invalid.
     */
    image: {
        supports_children: false,
        createBlock: ({ url }) => {
            const isValidImage = validateImageURL(url);
            return isValidImage
                ? {
                      type: "image",
                      image: {
                          type: "external",
                          external: {
                              url: url,
                          },
                      },
                  }
                : null;
        },
    },

    /**
     * Methods to create numbered list item blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks.
     * @method createBlock
     * @param {Object} options
     * @param {Array} [options.rtArray=[]] - An array of rich text items for the content.
     * @param {Array} [options.children=[]] - An array of child block objects.
     * @param {string} [options.color="default"] - Color for the text.
     * @returns {Object} A numbered list item block object.
     */
    numbered_list_item: {
        supports_children: true,
        createBlock: ({ rtArray = [], children = [], color = "default" }) => ({
            type: "numbered_list_item",
            numbered_list_item: {
                rich_text: rtArray,
                color: color,
                children: children,
            },
        }),
    },

    /**
     * Methods to create paragraph blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks.
     * @method createBlock
     * @param {Object} options
     * @param {Array} [options.rtArray=[]] - An array of rich text items for the content.
     * @param {Array} [options.children=[]] - An array of child block objects.
     * @param {string} [options.color="default"] - Color for the text.
     * @returns {Object} A paragraph block object.
     */
    paragraph: {
        supports_children: true,
        createBlock: ({ rtArray = [], children = [], color = "default" }) => ({
            type: "paragraph",
            paragraph: {
                rich_text: rtArray,
                color: color,
                children: children,
            },
        }),
    },

    /**
     * Methods to create PDF blocks.
     *
     * Returns null on invalid PDF URL; remove null from the final children array.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks (not supported for PDFs).
     * @method createBlock
     * @param {Object} options
     * @param {string} options.url - The URL for the PDF.
     * @returns {Object|null} A PDF block object or null if the URL is invalid.
     */
    pdf: {
        supports_children: false,
        createBlock: ({ url }) => {
            const isValidImage = validatePDFURL(url);
            return isValidImage
                ? {
                      type: "pdf",
                      pdf: {
                          type: "external",
                          external: {
                              url: url,
                          },
                      },
                  }
                : null;
        },
    },

    /**
     * Methods to create quote blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks.
     * @method createBlock
     * @param {Object} options
     * @param {Array} [options.rtArray=[]] - An array of rich text items for the quote.
     * @param {Array} [options.children=[]] - An array of child block objects.
     * @param {string} [options.color="default"] - Color for the text.
     * @returns {Object} A quote block object.
     */
    quote: {
        supports_children: true,
        createBlock: ({ rtArray = [], children = [], color = "default" }) => ({
            type: "quote",
            quote: {
                rich_text: rtArray,
                color: color,
                children: children,
            },
        }),
    },

    /**
     * Methods to create table blocks.
     *
     * Must have at least one row created along with it; width is defined by the first row.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks.
     * @method createBlock
     * @param {Object} options
     * @param {boolean} options.has_column_header - Whether the table has a column header.
     * @param {boolean} options.has_row_header - Whether the table has a row header.
     * @param {Array} options.children - An array of table row block objects.
     * @returns {Object} A table block object.
     */
    table: {
        // Must have at least one row created along with it. Width defined by first row.
        supports_children: true,
        createBlock: ({
            has_column_header,
            has_row_header,
            children = [],
        }) => ({
            type: "table",
            table: {
                table_width: children[0].length,
                has_column_header: has_column_header,
                has_row_header: has_row_header,
                children: children,
            },
        }),
    },

    /**
     * Methods to create table row blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks (not supported for table rows).
     * @method createBlock
     * @param {Object} options
     * @param {Array} [options.cells=[]] - An array of arrays of rich text objects for table cells.
     * @returns {Object} A table row block object.
     */
    table_row: {
        supports_children: false,
        createBlock: ({ cells = [] }) => ({
            // cells must be array of arrays of Rich Text Objects
            type: "table_row",
            table_row: {
                cells: cells,
            },
        }),
    },

    /**
     * Methods to create table of contents blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks (not supported for TOCs).
     * @method createBlock
     * @param {Object} options
     * @param {string} [options.color="default"] - Color for the table of contents.
     * @returns {Object} A table of contents block object.
     */
    table_of_contents: {
        supports_children: false,
        createBlock: ({ color = "default " }) => ({
            type: "table_of_contents",
            table_of_contents: {
                color: color,
            },
        }),
    },

    /**
     * Methods to create to-do list blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks.
     * @method createBlock
     * @param {Object} options
     * @param {Array} [options.rtArray=[]] - An array of rich text items for the to-do content.
     * @param {boolean} [options.checked=false] - Whether the to-do item is checked.
     * @param {Array} [options.children=[]] - An array of child block objects.
     * @param {string} [options.color="default"] - Color for the to-do text.
     * @returns {Object} A to-do list block object.
     */
    to_do: {
        supports_children: true,
        createBlock: ({
            rtArray = [],
            checked = false,
            children = [],
            color = "default",
        }) => ({
            type: "to_do",
            to_do: {
                rich_text: rtArray,
                checked: checked,
                color: color,
                children: children,
            },
        }),
    },

    /**
     * Methods to create toggle blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks.
     * @method createBlock
     * @param {Object} options
     * @param {Array} [options.rtArray=[]] - An array of rich text items for the toggle content.
     * @param {Array} [options.children=[]] - An array of child block objects.
     * @param {string} [options.color="default"] - Color for the toggle text.
     * @returns {Object} A toggle block object.
     */
    toggle: {
        supports_children: true,
        createBlock: ({ rtArray = [], children = [], color = "default" }) => ({
            type: "toggle",
            toggle: {
                rich_text: rtArray,
                color: color,
                children: children,
            },
        }),
    },

    /**
     * @typedef {Object} VideoBlockOptions
     * @property {string} url - The URL for the video.
     */

    /**
     * @typedef {Object} VideoBlock
     * @property {string} type - The block type.
     * @property {Object} video - The video object.
     * @property {string} video.type - The type of video ("external").
     * @property {Object} video.external - The external video details.
     * @property {string} video.external.url - The URL of the video.
     */

    /**
     * Methods to create video blocks.
     *
     * Returns null on invalid video URL; remove null from the final children array.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks (not supported for videos).
     * @param {VideoBlockOptions} options - Options to create a video block.
     * @returns {VideoBlock|null} A video block object or null if the URL is invalid.
     */
    video: {
        supports_children: false,
        createBlock: ({ url }) => {
            const isValidImage = validateVideoURL(url);
            return isValidImage
                ? {
                      type: "video",
                      video: {
                          type: "external",
                          external: {
                              url: url,
                          },
                      },
                  }
                : null;
        },
    },
};

const text = [
    { type: "heading_1", text: "Meeting plan" },
    { type: "paragraph", text: "This is the plan for today's meeting:" },
    { type: "video", text: "Discuss world domination" },
    { type: "to_do", text: "Go to lunch." }
]

const blocks = text.map(({type, text}) => block[type].createBlock({
    rtArray: buildRichTextObj(text),
}))

console.dir(blocks, { depth: null })
