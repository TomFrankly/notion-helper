import { buildRichTextObj, enforceRichText } from "./rich-text.mjs";
import { setIcon } from "./emoji-and-files.mjs";
import {
    isValidURL,
    validateImageURL,
    validatePDFURL,
    validateVideoURL,
    enforceStringLength,
} from "./utils.mjs";

/*
 * TODO
 *
 * - Create a wrapper class that can give blocks internal labels. Will be useful for appending child block arrays to specific blocks, and editing blocks after creation but before they are sent to Notion
 * - Remove undefined blocks from children arrays before making calls
 */

/**
 * Simple function to create standard Paragraph blocks from an array of strings without any special formatting. Each Paragraph block will contain a single Rich Text Object.
 *
 * @param {Array<string>} strings - an array of strings.
 * @returns {Array<Object>} - array of Paragraph blocks.
 */
export function makeParagraphBlocks(strings) {
    if (!Array.isArray(strings) || strings.length < 1) {
        console.error(
            `Invalid argument passed to makeParagraphs(). Expected a non-empty array.`
        );
        console.dir(strings);
        throw new Error(`Invalid argument: Expected a non-empty array.`);
    }

    /* Remove non-string elements */
    const validStrings = strings.filter((string) => typeof string === "string");

    /* Check each string's length, get a new array of strings */
    const lengthCheckedStrings = validStrings.flatMap((string) =>
        enforceStringLength(string)
    );

    /* Turn each string into an array with a single Rich Text Object */
    const richTextObjects = lengthCheckedStrings.map((string) =>
        buildRichTextObj(string)
    );

    /* Create a Paragraph block for each Rich Text Object */
    return richTextObjects.map((richText) =>
        block.paragraph.createBlock({ content: richText })
    );
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
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks.
     * @method createBlock
     * @param {string|Object} options - A string representing the URL, or an options object.
     * @param {string} options.url - The URL to be bookmarked.
     * @param {string|string[]|Array<Object>} [options.caption=[]] - The caption as a string, an array of strings, or an array of rich text objects.
     * @returns {Object} A bookmark block object compatible with Notion's API.
     * @example
     * // Use with just a URL
     * const simpleBookmark = block.bookmark.createBlock("https://www.flylighter.com");
     *
     * // Use with options object
     * const complexBookmark = block.bookmark.createBlock({
     *   url: "https://www.flylighter.com",
     *   caption: "Flylighter is a super-rad web clipper for Notion."
     * });
     *
     * // Use with options object and array of strings for caption
     * const multiLineBookmark = block.bookmark.createBlock({
     *   url: "https://www.flylighter.com",
     *   caption: ["Flylighter is a web clipper for Notion...", "...and Obsidian, too."]
     * });
     */
    bookmark: {
        supports_children: false,
        createBlock: (options) => {
            let url, caption;
            if (typeof options === "string") {
                url = options;
                caption = [];
            } else {
                ({ url, caption = [] } = options);
            }
            return {
                type: "bookmark",
                bookmark: {
                    url: url,
                    caption: enforceRichText(caption),
                },
            };
        },
    },

    /**
     * Methods to create bulleted list item blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks.
     * @method createBlock
     * @param {string|string[]|Object} options - A string, an array of strings, or an options object representing the list item content.
     * @param {string|string[]|Array<Object>} [options.content=[]] - The content as a string, an array of strings, or an array of rich text objects.
     * @param {Array<Object>} [options.children=[]] - An array of child block objects.
     * @param {string} [options.color="default"] - Color for the text.
     * @returns {Object} A bulleted list item block object compatible with Notion's API.
     * @example
     * // Use with a string
     * const simpleItem = block.bulleted_list_item.createBlock("Simple list item");
     *
     * // Use with an array of strings
     * const multiLineItem = block.bulleted_list_item.createBlock(["Line 1", "Line 2"]);
     *
     * // Use with options object
     * const complexItem = block.bulleted_list_item.createBlock({
     *   content: "Complex item",
     *   color: "red",
     *   children: [
     *     // Child blocks would go here
     *   ]
     * });
     */
    bulleted_list_item: {
        supports_children: true,
        createBlock: (options) => {
            let content, children, color;
            if (typeof options === "string" || Array.isArray(options)) {
                content = options;
                children = [];
                color = "default";
            } else {
                ({ content = [], children = [], color = "default" } = options);
            }
            return {
                type: "bulleted_list_item",
                bulleted_list_item: {
                    rich_text: enforceRichText(content),
                    color: color,
                    ...(children.length > 0 && { children }),
                },
            };
        },
    },

    /**
     * Methods to create callout blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks.
     * @method createBlock
     * @param {string|string[]|Object} options - A string, an array of strings, or an options object representing the callout content.
     * @param {string|string[]|Array<Object>} [options.content=[]] - The content as a string, an array of strings, or an array of rich text objects.
     * @param {string} [options.icon=""] - An optional icon value (URL for "external" or emoji character for "emoji").
     * @param {Array<Object>} [options.children=[]] - An array of child block objects.
     * @param {string} [options.color="default"] - Color for the callout background.
     * @returns {Object} A callout block object compatible with Notion's API.
     * @example
     * // Use with a string
     * const simpleCallout = block.callout.createBlock("I though I told you never to come in here, McFly!");
     *
     * // Use with options object
     * const complexCallout = block.callout.createBlock({
     *   content: "Now make like a tree and get outta here.",
     *   icon: "💡",
     *   color: "blue_background",
     *   children: [
     *     // Child blocks would go here
     *   ]
     * });
     */
    callout: {
        supports_children: true,
        createBlock: (options) => {
            let content, icon, children, color;
            if (typeof options === "string" || Array.isArray(options)) {
                content = options;
                icon = "";
                children = [];
                color = "default";
            } else {
                ({
                    content = [],
                    icon = "",
                    children = [],
                    color = "default",
                } = options);
            }
            return {
                type: "callout",
                callout: {
                    rich_text: enforceRichText(content),
                    icon: setIcon(icon),
                    color: color,
                    ...(children.length > 0 && { children }),
                },
            };
        },
    },

    /**
     * Methods to create code blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks (not supported for code).
     * @method createBlock
     * @param {string|Object} options - A string representing the code content, or an options object.
     * @param {string|string[]|Array<Object>} [options.content=[]] - The code content as a string, an array of strings, or an array of rich text objects.
     * @param {string|string[]|Array<Object>} [options.caption=[]] - The caption as a string, an array of strings, or an array of rich text objects.
     * @param {string} [options.language="plain text"] - Programming language of the code block.
     * @returns {Object} A code block object compatible with Notion's API.
     * @example
     * // Use with a string
     * const simpleCode = block.code.createBlock("console.log('Give me all the bacon and eggs you have.');");
     *
     * // Use with options object
     * const complexCode = block.code.createBlock({
     *   content: "const name = "Monkey D. Luffy"\n    console.log(`My name is ${name} and I will be king of the pirates!`)",
     *   language: "JavaScript",
     *   caption: "A simple JavaScript greeting function"
     * });
     */
    code: {
        supports_children: false,
        createBlock: (options) => {
            let content, caption, language;
            if (typeof options === "string") {
                content = options;
                caption = [];
                language = "plain text";
            } else {
                ({
                    content = [],
                    caption = [],
                    language = "plain text",
                } = options);
            }
            return {
                type: "code",
                code: {
                    rich_text: enforceRichText(content),
                    caption: enforceRichText(caption),
                    language: language,
                },
            };
        },
    },

    /**
     * Methods to create divider blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks (not supported for dividers).
     * @method createBlock
     * @returns {Object} A divider block object compatible with Notion's API.
     * @example
     * const divider = block.divider.createBlock();
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
     * @param {string|Object} options - A string representing the URL to be embedded, or an options object.
     * @param {string} options.url - The URL to be embedded.
     * @returns {Object} An embed block object compatible with Notion's API.
     * @example
     * // Use with a string
     * const simpleEmbed = block.embed.createBlock("https://www.youtube.com/watch?v=ec5m6t77eYM");
     *
     * // Use with options object
     * const complexEmbed = block.embed.createBlock({
     *   url: "https://www.youtube.com/watch?v=ec5m6t77eYM"
     * });
     */
    embed: {
        supports_children: false,
        createBlock: (options) => {
            const url = typeof options === "string" ? options : options.url;
            return {
                type: "embed",
                embed: {
                    url: url,
                },
            };
        },
    },

    /**
     * Methods to create file blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks (not supported for files).
     * @method createBlock
     * @param {string|Object} options - A string representing the file URL, or an options object.
     * @param {string} options.url - The URL for the file.
     * @param {string} [options.name] - The name of the file.
     * @param {string|string[]|Array<Object>} [options.caption=[]] - The caption as a string, an array of strings, or an array of rich text objects.
     * @returns {Object|null} A file block object compatible with Notion's API, or null if the URL is invalid.
     * @example
     * // Use with a string
     * const simpleFile = block.file.createBlock("https://collegeinfogeek.com/wp-content/uploads/2015/01/10steps-reddit.pdf");
     *
     * // Use with options object
     * const complexFile = block.file.createBlock({
     *   url: "https://collegeinfogeek.com/wp-content/uploads/2015/01/10steps-reddit.pdf",
     *   name: "10 Steps to Earning Awesome Grades (preview)",
     *   caption: "The Reddit preview of the 10 Steps to Earning Awesome Grades book."
     * });
     */
    file: {
        supports_children: false,
        createBlock: (options) => {
            let url, name, caption;
            if (typeof options === "string") {
                url = options;
                name = "";
                caption = [];
            } else {
                ({ url, name = "", caption = [] } = options);
            }
            const isValid = isValidURL(url);
            return isValid
                ? {
                      type: "file",
                      file: {
                          type: "external",
                          external: {
                              url: url,
                          },
                          caption: enforceRichText(caption),
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
     * @param {string|string[]|Object} options - A string, an array of strings, or an options object representing the heading content.
     * @param {string|string[]|Array<Object>} [options.content=[]] - The content as a string, an array of strings, or an array of rich text objects.
     * @param {string} [options.color="default"] - Color for the heading text.
     * @param {boolean} [options.is_toggleable=false] - Whether the heading is toggleable.
     * @param {Array<Object>} [options.children=[]] - An array of child block objects.
     * @returns {Object} A heading_1 block object compatible with Notion's API.
     * @example
     * // Use with a string
     * const simpleHeading = block.heading_1.createBlock("Simple Heading");
     *
     * // Use with options object
     * const complexHeading = block.heading_1.createBlock({
     *   content: "Complex Heading",
     *   color: "red",
     *   is_toggleable: true,
     *   children: [
     *     // Child blocks would go here
     *   ]
     * });
     */
    heading_1: {
        supports_children: true,
        createBlock: (options) => {
            let content, color, is_toggleable, children;
            if (typeof options === "string" || Array.isArray(options)) {
                content = options;
                color = "default";
                is_toggleable = false;
                children = [];
            } else {
                ({
                    content = [],
                    color = "default",
                    is_toggleable = false,
                    children = [],
                } = options);
            }
            return {
                type: "heading_1",
                heading_1: {
                    rich_text: enforceRichText(content),
                    color: color,
                    is_toggleable: is_toggleable,
                    ...(children.length > 0 && { children }),
                },
            };
        },
    },

    /**
     * Methods to create heading_2 blocks.
     *
     * Adding children will coerce headings to toggle headings.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks.
     * @method createBlock
     * @param {string|string[]|Object} options - A string, an array of strings, or an options object representing the heading content.
     * @param {string|string[]|Array<Object>} [options.content=[]] - The content as a string, an array of strings, or an array of rich text objects.
     * @param {string} [options.color="default"] - Color for the heading text.
     * @param {boolean} [options.is_toggleable=false] - Whether the heading is toggleable.
     * @param {Array<Object>} [options.children=[]] - An array of child block objects.
     * @returns {Object} A heading_2 block object compatible with Notion's API.
     * @example
     * // Use with a string
     * const simpleHeading = block.heading_2.createBlock("Simple Heading");
     *
     * // Use with options object
     * const complexHeading = block.heading_2.createBlock({
     *   content: "Complex Heading",
     *   color: "red",
     *   is_toggleable: true,
     *   children: [
     *     // Child blocks would go here
     *   ]
     * });
     */
    heading_2: {
        supports_children: true,
        createBlock: (options) => {
            let content, color, is_toggleable, children;
            if (typeof options === "string" || Array.isArray(options)) {
                content = options;
                color = "default";
                is_toggleable = false;
                children = [];
            } else {
                ({
                    content = [],
                    color = "default",
                    is_toggleable = false,
                    children = [],
                } = options);
            }
            return {
                type: "heading_2",
                heading_2: {
                    rich_text: enforceRichText(content),
                    color: color,
                    is_toggleable: is_toggleable,
                    ...(children.length > 0 && { children }),
                },
            };
        },
    },

    /**
     * Methods to create heading_3 blocks.
     *
     * Adding children will coerce headings to toggle headings.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks.
     * @method createBlock
     * @param {string|string[]|Object} options - A string, an array of strings, or an options object representing the heading content.
     * @param {string|string[]|Array<Object>} [options.content=[]] - The content as a string, an array of strings, or an array of rich text objects.
     * @param {string} [options.color="default"] - Color for the heading text.
     * @param {boolean} [options.is_toggleable=false] - Whether the heading is toggleable.
     * @param {Array<Object>} [options.children=[]] - An array of child block objects.
     * @returns {Object} A heading_3 block object compatible with Notion's API.
     * @example
     * // Use with a string
     * const simpleHeading = block.heading_3.createBlock("Simple Heading");
     *
     * // Use with options object
     * const complexHeading = block.heading_3.createBlock({
     *   content: "Complex Heading",
     *   color: "red",
     *   is_toggleable: true,
     *   children: [
     *     // Child blocks would go here
     *   ]
     * });
     */
    heading_3: {
        supports_children: true,
        createBlock: (options) => {
            let content, color, is_toggleable, children;
            if (typeof options === "string" || Array.isArray(options)) {
                content = options;
                color = "default";
                is_toggleable = false;
                children = [];
            } else {
                ({
                    content = [],
                    color = "default",
                    is_toggleable = false,
                    children = [],
                } = options);
            }
            return {
                type: "heading_3",
                heading_3: {
                    rich_text: enforceRichText(content),
                    color: color,
                    is_toggleable: is_toggleable,
                    ...(children.length > 0 && { children }),
                },
            };
        },
    },

    /**
     * Methods to create image blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks (not supported for images).
     * @method createBlock
     * @param {string|Object} options - A string representing the image URL, or an options object.
     * @param {string} options.url - The URL for the image.
     * @param {string|string[]|Array<Object>} [options.caption=[]] - The caption as a string, an array of strings, or an array of rich text objects.
     * @returns {Object|null} An image block object compatible with Notion's API, or null if the URL is invalid.
     * @example
     * // Use with a string
     * const simpleImage = block.image.createBlock("https://i.imgur.com/5vSShIw.jpeg");
     *
     * // Use with options object
     * const complexImage = block.image.createBlock({
     *   url: "https://i.imgur.com/5vSShIw.jpeg",
     *   caption: "A beautiful landscape"
     * });
     */
    image: {
        supports_children: false,
        createBlock: (options) => {
            let url, caption;
            if (typeof options === "string") {
                url = options;
                caption = [];
            } else {
                ({ url, caption = [] } = options);
            }
            const isValidImage = validateImageURL(url);
            return isValidImage
                ? {
                      type: "image",
                      image: {
                          type: "external",
                          external: {
                              url: url,
                          },
                          caption: enforceRichText(caption),
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
     * @param {string|string[]|Object} options - A string, an array of strings, or an options object representing the list item content.
     * @param {string|string[]|Array<Object>} [options.content=[]] - The content as a string, an array of strings, or an array of rich text objects.
     * @param {Array<Object>} [options.children=[]] - An array of child block objects.
     * @param {string} [options.color="default"] - Color for the text.
     * @returns {Object} A numbered list item block object compatible with Notion's API.
     * @example
     * // Use with a string
     * const simpleItem = block.numbered_list_item.createBlock("Simple list item");
     *
     * // Use with an array of strings
     * const multiLineItem = block.numbered_list_item.createBlock(["Line 1", "Line 2"]);
     *
     * // Use with options object
     * const complexItem = block.numbered_list_item.createBlock({
     *   content: "Complex item",
     *   color: "red",
     *   children: [
     *     // Child blocks would go here
     *   ]
     * });
     */
    numbered_list_item: {
        supports_children: true,
        createBlock: (options) => {
            let content, children, color;
            if (typeof options === "string" || Array.isArray(options)) {
                content = options;
                children = [];
                color = "default";
            } else {
                ({ content = [], children = [], color = "default" } = options);
            }
            return {
                type: "numbered_list_item",
                numbered_list_item: {
                    rich_text: enforceRichText(content),
                    color: color,
                    ...(children.length > 0 && { children }),
                },
            };
        },
    },

    /**
     * Methods to create paragraph blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks.
     * @method createBlock
     * @param {string|string[]|Object} options - A string, an array of strings, or an options object representing the paragraph content.
     * @param {string|string[]|Array<Object>} [options.content=[]] - The content as a string, an array of strings, or an array of rich text objects.
     * @param {Array<Object>} [options.children=[]] - An array of child block objects.
     * @param {string} [options.color="default"] - Color for the text.
     * @returns {Object} A paragraph block object compatible with Notion's API.
     * @example
     * // Direct use with a string
     * const paragraphBlock = block.paragraph.createBlock("Hello, World!");
     *
     * // Direct use with an array of strings
     * const multiLineParagraph = block.paragraph.createBlock(["I'm a line", "I'm also a line!"]);
     *
     * // Usage with options object
     * const complexParagraph = block.paragraph.createBlock({
     *   content: "Complex paragraph",
     *   color: "red",
     *   children: [
     *     // Child blocks would go here
     *   ]
     * });
     */
    paragraph: {
        supports_children: true,
        createBlock: (options) => {
            let content, children, color;
            if (typeof options === "string" || Array.isArray(options)) {
                content = options;
                children = [];
                color = "default";
            } else {
                ({ content = [], children = [], color = "default" } = options);
            }
            return {
                type: "paragraph",
                paragraph: {
                    rich_text: enforceRichText(content),
                    color: color,
                    ...(children.length > 0 && { children }),
                },
            };
        },
    },

    /**
     * Methods to create PDF blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks (not supported for PDFs).
     * @method createBlock
     * @param {string|Object} options - A string representing the PDF URL, or an options object.
     * @param {string} options.url - The URL for the PDF.
     * @param {string|string[]|Array<Object>} [options.caption=[]] - The caption as a string, an array of strings, or an array of rich text objects.
     * @returns {Object|null} A PDF block object compatible with Notion's API, or null if the URL is invalid.
     * @example
     * // Use with a string
     * const simplePDF = block.pdf.createBlock("https://collegeinfogeek.com/wp-content/uploads/2015/01/10steps-reddit.pdf");
     *
     * // Use with options object
     * const complexPDF = block.pdf.createBlock({
     *   url: "https://collegeinfogeek.com/wp-content/uploads/2015/01/10steps-reddit.pdf",
     *   caption: "The Reddit preview of the 10 Steps to Earning Awesome Grades book."
     * });
     */
    pdf: {
        supports_children: false,
        createBlock: (options) => {
            let url, caption;
            if (typeof options === "string") {
                url = options;
                caption = [];
            } else {
                ({ url, caption = [] } = options);
            }
            const isValidPDF = validatePDFURL(url);
            return isValidPDF
                ? {
                      type: "pdf",
                      pdf: {
                          type: "external",
                          external: {
                              url: url,
                          },
                          caption: enforceRichText(caption),
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
     * @param {string|string[]|Object} options - A string, an array of strings, or an options object representing the quote content.
     * @param {string|string[]|Array<Object>} [options.content=[]] - The content as a string, an array of strings, or an array of rich text objects.
     * @param {Array<Object>} [options.children=[]] - An array of child block objects.
     * @param {string} [options.color="default"] - Color for the text.
     * @returns {Object} A quote block object compatible with Notion's API.
     * @example
     * // Use with a string
     * const simpleQuote = block.quote.createBlock("Simple quote");
     *
     * // Use with an array of strings
     * const multiLineQuote = block.quote.createBlock(["Line 1 of quote", "Line 2 of quote"]);
     *
     * // Use with options object
     * const complexQuote = block.quote.createBlock({
     *   content: "Complex quote",
     *   color: "gray",
     *   children: [
     *     // Child blocks would go here
     *   ]
     * });
     */
    quote: {
        supports_children: true,
        createBlock: (options) => {
            let content, children, color;
            if (typeof options === "string" || Array.isArray(options)) {
                content = options;
                children = [];
                color = "default";
            } else {
                ({ content = [], children = [], color = "default" } = options);
            }
            return {
                type: "quote",
                quote: {
                    rich_text: enforceRichText(content),
                    color: color,
                    ...(children.length > 0 && { children }),
                },
            };
        },
    },

    /**
     * Methods to create table blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks.
     * @method createBlock
     * @param {Object} options - Options for creating the table.
     * @param {boolean} [options.has_column_header=false] - Whether the table has a column header.
     * @param {boolean} [options.has_row_header=false] - Whether the table has a row header.
     * @param {Array<Array<string>>|Array<Object>} options.rows - An array of rows. Each row can be an array of strings or a table_row object.
     * @returns {Object} A table block object compatible with Notion's API.
     * @example
     * // Use with array of string arrays
     * const simpleTable = block.table.createBlock({
     *   rows: [
     *     ["Header 1", "Header 2"],
     *     ["Row 1, Cell 1", "Row 1, Cell 2"],
     *     ["Row 2, Cell 1", "Row 2, Cell 2"]
     *   ],
     *   has_column_header: true
     * });
     *
     * // Use with array of table_row objects
     * const complexTable = block.table.createBlock({
     *   rows: [
     *     block.table_row.createBlock(["Header 1", "Header 2"]),
     *     block.table_row.createBlock(["Row 1, Cell 1", "Row 1, Cell 2"]),
     *     block.table_row.createBlock(["Row 2, Cell 1", "Row 2, Cell 2"])
     *   ],
     *   has_column_header: true,
     *   has_row_header: false
     * });
     */
    table: {
        supports_children: true,
        createBlock: ({
            has_column_header = false,
            has_row_header = false,
            rows = [],
        }) => {
            const children = rows.map((row) =>
                Array.isArray(row) ? block.table_row.createBlock(row) : row
            );
            return {
                type: "table",
                table: {
                    table_width: children[0].table_row.cells.length,
                    has_column_header: has_column_header,
                    has_row_header: has_row_header,
                    children: children,
                },
            };
        },
    },

    /**
     * Methods to create table row blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks (not supported for table rows).
     * @method createBlock
     * @param {Array<string|Array<Object>>} cells - An array of cell contents. Each cell can be a string or an array of rich text objects.
     * @returns {Object} A table row block object compatible with Notion's API.
     * @example
     * // Use with an array of strings
     * const simpleRow = block.table_row.createBlock(["Cell 1", "Cell 2", "Cell 3"]);
     *
     * // Use with an array of rich text objects
     * const complexRow = block.table_row.createBlock([
     *   [{ type: "text", text: { content: "Cell 1" } }],
     *   [{ type: "text", text: { content: "Cell 2", annotations: { bold: true } } }],
     *   [{ type: "text", text: { content: "Cell 3" } }]
     * ]);
     */
    table_row: {
        supports_children: false,
        createBlock: (cells = []) => ({
            type: "table_row",
            table_row: {
                cells: cells.map((cell) =>
                    typeof cell === "string" ? enforceRichText(cell) : cell
                ),
            },
        }),
    },

    /**
     * Methods to create table of contents blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks (not supported for TOCs).
     * @method createBlock
     * @param {string|Object} [options="default"] - A string representing the color, or an options object.
     * @param {string} [options.color="default"] - Color for the table of contents.
     * @returns {Object} A table of contents block object compatible with Notion's API.
     * @example
     * // Use with default settings
     * const simpleTOC = block.table_of_contents.createBlock();
     *
     * // Use with a color string
     * const coloredTOC = block.table_of_contents.createBlock("red");
     *
     * // Use with options object
     * const complexTOC = block.table_of_contents.createBlock({ color: "blue" });
     */
    table_of_contents: {
        supports_children: false,
        createBlock: (options = "default") => {
            const color =
                typeof options === "string"
                    ? options
                    : options.color || "default";
            return {
                type: "table_of_contents",
                table_of_contents: {
                    color: color,
                },
            };
        },
    },

    /**
     * Methods to create to-do list blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks.
     * @method createBlock
     * @param {string|string[]|Object} options - A string, an array of strings, or an options object representing the to-do content.
     * @param {string|string[]|Array<Object>} [options.content=[]] - The content as a string, an array of strings, or an array of rich text objects.
     * @param {boolean} [options.checked=false] - Whether the to-do item is checked.
     * @param {Array<Object>} [options.children=[]] - An array of child block objects.
     * @param {string} [options.color="default"] - Color for the to-do text.
     * @returns {Object} A to-do list block object compatible with Notion's API.
     * @example
     * // Use with a string
     * const simpleToDo = block.to_do.createBlock("Simple task");
     *
     * // Use with options object
     * const complexToDo = block.to_do.createBlock({
     *   content: "Complex task",
     *   checked: true,
     *   color: "green",
     *   children: [
     *     // Child blocks would go here
     *   ]
     * });
     */
    to_do: {
        supports_children: true,
        createBlock: (options) => {
            let content, checked, children, color;
            if (typeof options === "string" || Array.isArray(options)) {
                content = options;
                checked = false;
                children = [];
                color = "default";
            } else {
                ({
                    content = [],
                    checked = false,
                    children = [],
                    color = "default",
                } = options);
            }
            return {
                type: "to_do",
                to_do: {
                    rich_text: enforceRichText(content),
                    checked: checked,
                    color: color,
                    ...(children.length > 0 && { children }),
                },
            };
        },
    },

    /**
     * Methods to create toggle blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks.
     * @method createBlock
     * @param {string|string[]|Object} options - A string, an array of strings, or an options object representing the toggle content.
     * @param {string|string[]|Array<Object>} [options.content=[]] - The content as a string, an array of strings, or an array of rich text objects.
     * @param {Array<Object>} [options.children=[]] - An array of child block objects.
     * @param {string} [options.color="default"] - Color for the toggle text.
     * @returns {Object} A toggle block object compatible with Notion's API.
     * @example
     * // Use with a string
     * const simpleToggle = block.toggle.createBlock("Simple toggle");
     *
     * // Use with options object
     * const complexToggle = block.toggle.createBlock({
     *   content: "Complex toggle",
     *   color: "blue",
     *   children: [
     *     // Child blocks would go here
     *   ]
     * });
     */
    toggle: {
        supports_children: true,
        createBlock: (options) => {
            let content, children, color;
            if (typeof options === "string" || Array.isArray(options)) {
                content = options;
                children = [];
                color = "default";
            } else {
                ({ content = [], children = [], color = "default" } = options);
            }
            return {
                type: "toggle",
                toggle: {
                    rich_text: enforceRichText(content),
                    color: color,
                    ...(children.length > 0 && { children }),
                },
            };
        },
    },

    /**
     * Methods to create video blocks.
     *
     * @property {boolean} supports_children - Indicates if the block supports child blocks (not supported for videos).
     * @method createBlock
     * @param {string|Object} options - A string representing the video URL, or an options object.
     * @param {string} options.url - The URL for the video.
     * @param {string|string[]|Array<Object>} [options.caption=[]] - The caption as a string, an array of strings, or an array of rich text objects.
     * @returns {Object|null} A video block object compatible with Notion's API, or null if the URL is invalid.
     * @example
     * // Use with a string
     * const simpleVideo = block.video.createBlock("https://www.youtube.com/watch?v=ec5m6t77eYM");
     *
     * // Use with options object
     * const complexVideo = block.video.createBlock({
     *   url: "https://www.youtube.com/watch?v=ec5m6t77eYM",
     *   caption: "Never gonna give you up"
     * });
     */
    video: {
        supports_children: false,
        createBlock: (options) => {
            let url, caption;
            if (typeof options === "string") {
                url = options;
                caption = [];
            } else {
                ({ url, caption = [] } = options);
            }
            const isValidVideo = validateVideoURL(url);
            return isValidVideo
                ? {
                      type: "video",
                      video: {
                          type: "external",
                          external: {
                              url: url,
                          },
                          caption: enforceRichText(caption),
                      },
                  }
                : null;
        },
    },
};

/*
 * Quality-of-life functions for blocks:
 */

/**
 * Creates a bookmark block.
 * @param {string|Object} options - A string representing the URL, or an options object.
 * @see block.bookmark for full documentation
 * @returns {Object} a bookmark block.
 */
export function bookmark(options) {
    return block.bookmark.createBlock(options);
}

/**
 * Creates a bulleted list item block.
 * @param {string|string[]|Object} options - A string, an array of strings, or an options object representing the list item content.
 * @see block.bulleted_list_item for full documentation
 * @returns {Object} A bulleted list item block.
 */
export function bulletedListItem(options) {
    return block.bulleted_list_item.createBlock(options);
}

/**
 * Shorthand alias for bulletedListItem(). Creates a bulleted list item block.
 * @param {string|string[]|Object} options - A string, an array of strings, or an options object representing the list item content.
 * @see block.bulleted_list_item for full documentation
 * @returns {Object} A bulleted list item block.
 */
export function bullet(options) {
    return bulletedListItem(options)
}

/**
 * Creates a callout block.
 * @param {string|string[]|Object} options - A string, an array of strings, or an options object representing the callout content.
 * @see block.callout for full documentation
 * @returns {Object} A callout block.
 */
export function callout(options) {
    return block.callout.createBlock(options);
}

/**
 * Creates a code block.
 * @param {string|Object} options - A string representing the code content, or an options object.
 * @see block.code for full documentation
 * @returns {Object} A code block.
 */
export function code(options) {
    return block.code.createBlock(options);
}

/**
 * Creates a divider block.
 * @see block.divider for full documentation
 * @returns {Object} A divider block.
 */
export function divider() {
    return block.divider.createBlock();
}

/**
 * Creates an embed block.
 * @param {string|Object} options - A string representing the URL to be embedded, or an options object.
 * @see block.embed for full documentation
 * @returns {Object} An embed block.
 */
export function embed(options) {
    return block.embed.createBlock(options);
}

/**
 * Creates a file block.
 * @param {string|Object} options - A string representing the file URL, or an options object.
 * @see block.file for full documentation
 * @returns {Object|null} A file block or null if the URL is invalid.
 */
export function file(options) {
    return block.file.createBlock(options);
}

/**
 * Creates a heading_1 block.
 * @param {string|string[]|Object} options - A string, an array of strings, or an options object representing the heading content.
 * @see block.heading_1 for full documentation
 * @returns {Object} A heading_1 block.
 */
export function heading1(options) {
    return block.heading_1.createBlock(options);
}

/**
 * Creates a heading_2 block.
 * @param {string|string[]|Object} options - A string, an array of strings, or an options object representing the heading content.
 * @see block.heading_2 for full documentation
 * @returns {Object} A heading_2 block.
 */
export function heading2(options) {
    return block.heading_2.createBlock(options);
}

/**
 * Creates a heading_3 block.
 * @param {string|string[]|Object} options - A string, an array of strings, or an options object representing the heading content.
 * @see block.heading_3 for full documentation
 * @returns {Object} A heading_3 block.
 */
export function heading3(options) {
    return block.heading_3.createBlock(options);
}

/**
 * Creates an image block.
 * @param {string|Object} options - A string representing the image URL, or an options object.
 * @see block.image for full documentation
 * @returns {Object|null} An image block or null if the URL is invalid.
 */
export function image(options) {
    return block.image.createBlock(options);
}

/**
 * Creates a numbered list item block.
 * @param {string|string[]|Object} options - A string, an array of strings, or an options object representing the list item content.
 * @see block.numbered_list_item for full documentation
 * @returns {Object} A numbered list item block.
 */
export function numberedListItem(options) {
    return block.numbered_list_item.createBlock(options);
}

/**
 * Shorthand alias function for numberedListItem(). Creates a numbered list item block.
 * @param {string|string[]|Object} options - A string, an array of strings, or an options object representing the list item content.
 * @see block.numbered_list_item for full documentation
 * @returns {Object} A numbered list item block.
 */
export function num(options) {
    return numberedListItem(options);
}

/**
 * Creates a paragraph block.
 * @param {string|string[]|Object} options - A string, an array of strings, or an options object representing the paragraph content.
 * @see block.paragraph for full documentation
 * @returns {Object} A paragraph block.
 */
export function paragraph(options) {
    return block.paragraph.createBlock(options);
}

/**
 * Creates a PDF block.
 * @param {string|Object} options - A string representing the PDF URL, or an options object.
 * @see block.pdf for full documentation
 * @returns {Object|null} A PDF block or null if the URL is invalid.
 */
export function pdf(options) {
    return block.pdf.createBlock(options);
}

/**
 * Creates a quote block.
 * @param {string|string[]|Object} options - A string, an array of strings, or an options object representing the quote content.
 * @see block.quote for full documentation
 * @returns {Object} A quote block.
 */
export function quote(options) {
    return block.quote.createBlock(options);
}

/**
 * Creates a table block.
 * @param {Object} options - Options for creating the table.
 * @see block.table for full documentation
 * @returns {Object} A table block.
 */
export function table(options) {
    return block.table.createBlock(options);
}

/**
 * Creates a table row block.
 * @param {Array<string|Array<Object>>} cells - An array of cell contents.
 * @see block.table_row for full documentation
 * @returns {Object} A table row block.
 */
export function tableRow(cells) {
    return block.table_row.createBlock(cells);
}

/**
 * Creates a table of contents block.
 * @param {string|Object} [options="default"] - A string representing the color, or an options object.
 * @see block.table_of_contents for full documentation
 * @returns {Object} A table of contents block.
 */
export function tableOfContents(options) {
    return block.table_of_contents.createBlock(options);
}

/**
 * Creates a to-do list block.
 * @param {string|string[]|Object} options - A string, an array of strings, or an options object representing the to-do content.
 * @see block.to_do for full documentation
 * @returns {Object} A to-do list block.
 */
export function toDo(options) {
    return block.to_do.createBlock(options);
}

/**
 * Creates a toggle block.
 * @param {string|string[]|Object} options - A string, an array of strings, or an options object representing the toggle content.
 * @see block.toggle for full documentation
 * @returns {Object} A toggle block.
 */
export function toggle(options) {
    return block.toggle.createBlock(options);
}

/**
 * Creates a video block.
 * @param {string|Object} options - A string representing the video URL, or an options object.
 * @see block.video for full documentation
 * @returns {Object|null} A video block or null if the URL is invalid.
 */
export function video(options) {
    return block.video.createBlock(options);
}
