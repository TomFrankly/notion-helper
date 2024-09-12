import { buildRichTextObj } from "./rich-text.mjs";
import { makeParagraphBlocks } from "./blocks.mjs";
import { page_meta, page_props } from "./page-meta.mjs";
import { block } from "./blocks.mjs";
import CONSTANTS from "./constants.mjs";
// TODO - allow passing in a Notion db response in order to validate against the db itself
// TODO - probably split out schema validation as its own function

/**
 *
 * @param {Object} options
 * @param {string} parent - The ID of the parent page or database.
 * @param {string} parent_type - "page_id" or "database_id".
 * @param {(Array<Object>|Object)} pages - an array of simple objects, each of which will be turned into a valid page object. Each can have property types that match to valid Notion page properties, as well as a "cover", "icon", and "children" property. The "children" prop's value should be either a string or an array. You can also pass a single object, but the function will still return an array.
 * @param {Object} schema - an object that maps the schema of the pages objects to property names and types in the parent. Saves you from needing to specify the property name and type from the target Notion database for every entry in your pages object. For each property in your pages object that should map to a Notion database property, specify the key as the property name in the pages object and set the value as an array with the Notion property name as the first element and the property type as the second. Non-valid property types will be filtered out. Optionall, you can specify custom keys for the icon (["Icon", "icon"]), cover (["Cover", "cover"]), and children array (["Children", "children"]).
 * @param {function} childrenFn - a callback you can specify that will run on any array elements present in a "children" property of any object in the pages array. If that "children" property contains a single string, it'll run on that as well. If omitted, any "children" values will be converted to Paragraph blocks by default.
 *
 * @example
 * const database = "abcdefghijklmnopqrstuvwxyz"
 *
 * const tasks = [ {
 *   icon: "😛",
 *   task: "Build Standing Desk",
 *   due: "2024-09-10",
 *   status: "Not started"
 * } ]
 *
 * const schema = {
 *   task: [ "Name", "title" ],
 *   due: [ "Due Date", "date"],
 *   status: [ "Status", "status" ]
 * }
 *
 * const pageObjects = quickPages({
 *      parent: database,
 *      parent_type: "database_id",
 *      pages: tasks,
 *      schema: schema,
 *      childrenFn: (value) => NotionHelper.makeParagraphs(value)
 * })
 * @returns {Array<Object>} - An array of page objects, each of which can be directly passed as the children for a POST request to https://api.notion.com/v1/pages (or as the single argument to notion.pages.create() when using the SDK).
 */
export function quickPages({ parent, parent_type, pages, schema, childrenFn }) {
    let pageArray;

    if (Array.isArray(pages)) {
        pageArray = pages;
    } else {
        pageArray[pages];
    }

    return pages.map((page) => {
        const iconSchema = Object.fromEntries(
            Object.entries(schema).filter(
                ([propName, propDef]) => propDef[1] === "icon"
            )
        );

        const coverSchema = Object.fromEntries(
            Object.entries(schema).filter(
                ([propName, propDef]) => propDef[1] === "cover"
            )
        );

        let icon;
        if (Object.entries(iconSchema).length === 1) {
            let entry = page[Object.keys(iconSchema)[0]];
            if (entry && typeof entry === "string" && entry !== "") {
                icon = entry;
            }
        } else if (
            page.icon &&
            typeof page.icon === "string" &&
            page.icon !== ""
        ) {
            icon = page.icon;
        }

        let cover;
        if (Object.entries(coverSchema).length === 1) {
            let entry = page[Object.keys(coverSchema)[0]];
            if (entry && typeof entry === "string" && entry !== "") {
                cover = entry;
            }
        } else if (
            page.cover &&
            typeof page.cover === "string" &&
            page.cover !== ""
        ) {
            cover = page.cover;
        }

        const finalPage = {
            parent: page_meta.parent.createMeta({
                id: parent,
                type: parent_type,
            }),
            ...(icon && page_meta.icon.createMeta(icon)),
            ...(cover && page_meta.cover.createMeta(cover)),
        };

        const validatedSchema = Object.fromEntries(
            Object.entries(schema).filter(([propName, propDef]) =>
                Object.keys(page_props).includes(propDef[1])
            )
        );

        finalPage.properties = Object.entries(page)
            .filter(([key]) => key in validatedSchema)
            .reduce((acc, [key, val]) => {
                const [propName, propType] = validatedSchema[key];
                let value;

                if (
                    ["title", "rich_text"].includes(propType) &&
                    typeof val === "string"
                ) {
                    value = buildRichTextObj(val);
                } else {
                    value = val;
                }

                const propResult = page_props[propType].createProp(value);

                const propKey = Object.keys(propResult)[0];
                if (propResult[propKey] !== null) {
                    acc[propName] = propResult;
                }

                return acc;
            }, {});

        let pageChildren;

        const childrenSchema = Object.fromEntries(
            Object.entries(schema).filter(
                ([propName, propDef]) => propDef[1] === "children"
            )
        );

        let childrenProp;
        if (Object.entries(childrenSchema).length === 1) {
            childrenProp = page[Object.keys(childrenSchema)[0]];
        } else if (page.children) {
            childrenProp = page.children;
        }

        if (childrenProp) {
            if (typeof childrenProp === "string" && childrenProp.trim()) {
                pageChildren = [childrenProp];
            } else if (Array.isArray(childrenProp) && childrenProp.length > 0) {
                pageChildren = childrenProp;
            } else {
                console.warn(
                    `Invalid page children data type submitted for the page object below. Children data will be omitted.`
                );
                console.dir(page);
                pageChildren = [];
            }

            console.log(typeof childrenFn);
            if (typeof childrenFn === "function") {
                finalPage.children = childrenFn(pageChildren);
            } else if (typeof pageChildren[0] === "string") {
                finalPage.children = makeParagraphBlocks(pageChildren);
            }
        }

        return finalPage;
    });
}

export function createNotion() {
    let data,
        currentBlockStack,
        nestingLevel,
        hasPageParent,
        hasProperty,
        hasBlock;

    /**
     * Resets the builder to its initial state.
     * @private
     */
    function resetBuilder() {
        date = {
            properties: {},
            children: [],
        };
        currentBlockStack = [{ block: data, children: data.children }];
        nestingLevel = 0;
        hasPageParent = false;
        hasProperty = false;
        hasBlock = false;
    }

    /**
     * Splits an array of blocks if it exceeds the maximum size allowed by the Notion API.
     * @private
     * @param {Array} blocks - The array of blocks to chunk.
     * @param {number} [chunkSize=CONSTANTS.MAX_BLOCKS] - The maximum size of each chunk.
     * @returns {Array} An array of block chunks.
     */
    function chunkBlocks(blocks, chunkSize = CONSTANTS.MAX_BLOCKS) {
        const chunkedBlocks = [];
        for (let i = 0; i < blocks.length; i += chunkSize) {
            chunkBlocks.push(blocks.slice(i, i + chunkSize));
        }
        return chunkBlocks;
    }

    resetBuilder();

    const builder = {
        // Page Methods
        /**
         * Sets the parent database for the page.
         * @param {string} database_id - The ID of the parent database.
         * @returns {Object} The builder instance for method chaining.
         */
        dbId(database_id) {
            data.parent = page_meta.parent.createMeta({
                id: database_id,
                type: "database_id",
            });
            hasPageParent = true;
            nestingLevel++;
            return this;
        },

        /**
         * Sets the parent page for the page.
         * @param {string} page_id - The ID of the parent page.
         * @returns {Object} The builder instance for method chaining.
         */
        pageId(page_id) {
            data.parent = page_meta.parent.createMeta({
                id: page_id,
                type: "page_id",
            });
            hasPageParent = true;
            nestingLevel++;
            return this;
        },

        /**
         * Sets the cover image for the page.
         * @param {string} url - The URL of the cover image.
         * @returns {Object} The builder instance for method chaining.
         */
        cover(url) {
            data.cover = page_meta.cover.createMeta(url);
            return this;
        },

        /**
         * Sets the icon for the page.
         * @param {string} url - The URL of the icon image or an emoji.
         * @returns {Object} The builder instance for method chaining.
         */
        icon(url) {
            data.icon = page_meta.icon.createMeta(url);
            return this;
        },

        // Property Methods
        /**
         * Adds a custom property to the page.
         * @param {string} name - The name of the property.
         * @param {string} type - The type of the property.
         * @param {*} value - The value of the property.
         * @throws {Error} If the property type is invalid.
         * @returns {Object} The builder instance for method chaining.
         */
        property(name, type, value) {
            if (!page_props[type]) {
                const error = `Invalid property type: ${type}`;
                console.error(error);
                throw new Error(error);
            }
            data.properties[name] = page_props[type].createProp(value);
            hasProperty = true;
            return this;
        },

        /**
         * Sets a title property value for the page.
         * @param {string} name - The name of the property.
         * @param {string|Array} value - The title value.
         * @returns {Object} The builder instance for method chaining.
         */
        title(name, value) {
            data.properties[name] = page_props.title.createProp(value);
            hasProperty = true;
            return this;
        },

        /**
         * Sets a rich text property value for the page.
         * @param {string} name - The name of the property.
         * @param {string|Array} value - The rich text value.
         * @returns {Object} The builder instance for method chaining.
         */
        richText(name, value) {
            data.properties[name] = page_props.rich_text.createProp(value);
            hasProperty = true;
            return this;
        },

        /**
         * Sets a checkbox property value for the page.
         * @param {string} name - The name of the property.
         * @param {boolean} value - The checkbox value.
         * @returns {Object} The builder instance for method chaining.
         */
        checkbox(name, value) {
            data.properties[name] = page_props.checkbox.createProp(value);
            hasProperty = true;
            return this;
        },

        /**
         * Sets a date property value for the page.
         * @param {string} name - The name of the property.
         * @param {string} start - The start date.
         * @param {string} [end=null] - The end date (optional).
         * @returns {Object} The builder instance for method chaining.
         */
        date(name, start, end = null) {
            data.properties[name] = page_props.date.createProp(start, end);
            hasProperty = true;
            return this;
        },

        /**
         * Sets a email property value for the page.
         * @param {string} name - The name of the property.
         * @param {string} value - The email value.
         * @returns {Object} The builder instance for method chaining.
         */
        email(name, value) {
            data.properties[name] = page_props.email.createProp(value);
            hasProperty = true;
            return this;
        },

        /**
         * Sets a files property value for the page.
         * 
         * NOTE: The separate file() method creates a file block.
         * 
         * @param {string} name - The name of the property.
         * @param {Array} fileArray - An array of file objects.
         * @returns {Object} The builder instance for method chaining.
         */
        files(name, fileArray) {
            data.properties[name] = page_props.files.createProp(fileArray);
            hasProperty = true;
            return this;
        },

        /**
         * Sets a multi-select property value for the page.
         * @param {string} name - The name of the property.
         * @param {Array} valuesArray - An array of selected values.
         * @returns {Object} The builder instance for method chaining.
         */
        multiSelect(name, valuesArray) {
            data.properties[name] =
                page_props.multi_select.createProp(valuesArray);
            hasProperty = true;
            return this;
        },

        /**
         * Sets a number property value for the page.
         * @param {string} name - The name of the property.
         * @param {number} value - The number value.
         * @returns {Object} The builder instance for method chaining.
         */
        number(name, value) {
            data.properties[name] = page_props.number.createProp(value);
            hasProperty = true;
            return this;
        },

        /**
         * Sets a people property value for the page.
         * @param {string} name - The name of the property.
         * @param {Array} personArray - An array of person IDs.
         * @returns {Object} The builder instance for method chaining.
         */
        people(name, personArray) {
            data.properties[name] = page_props.people.createProp(personArray);
            hasProperty = true;
            return this;
        },

        /**
         * Sets a phone number property value for the page.
         * @param {string} name - The name of the property.
         * @param {string} value - The phone number value.
         * @returns {Object} The builder instance for method chaining.
         */
        phoneNumber(name, value) {
            data.properties[name] = page_props.phone_number.createProp(value);
            hasProperty = true;
            return this;
        },

        /**
         * Sets a relation property value for the page.
         * @param {string} name - The name of the property.
         * @param {Array} pageArray - An array of related page IDs.
         * @returns {Object} The builder instance for method chaining.
         */
        relation(name, pageArray) {
            data.properties[name] = page_props.relation.createProp(pageArray);
            hasProperty = true;
            return this;
        },

        /**
         * Sets a select property value for the page.
         * @param {string} name - The name of the property.
         * @param {string} value - The selected value.
         * @returns {Object} The builder instance for method chaining.
         */
        select(name, value) {
            data.properties[name] = page_props.select.createProp(value);
            hasProperty = true;
            return this;
        },

        /**
         * Sets a status property value for the page.
         * @param {string} name - The name of the property.
         * @param {string} value - The status value.
         * @returns {Object} The builder instance for method chaining.
         */
        status(name, value) {
            data.properties[name] = page_props.status.createProp(value);
            hasProperty = true;
            return this;
        },

        /**
         * Sets a URL property value for the page.
         * @param {string} name - The name of the property.
         * @param {string} value - The URL value.
         * @returns {Object} The builder instance for method chaining.
         */
        url(name, value) {
            data.properties[name] = page_props.url.createProp(value);
            hasProperty = true;
            return this;
        },

        // Block Methods
        /**
         * Starts a new parent block that can contain child blocks.
         *
         * @param {string} blockType - The type of block to create as a parent.
         * @param {Object} [options={}] - Options for creating the block, specific to the block type.
         * @throws {Error} If the nesting level exceeds 2 or if the block type doesn't support children.
         * @returns {Object} The builder instance for method chaining.
         * @example
         * notion.startParent('toggle', 'Click to expand')
         *       .paragraph('This is inside the toggle')
         *       .endParent();
         */
        startParent(blockType, options = {}) {
            if (nestingLevel > 2) {
                const error = `Nesting level exceeded. Requests can only have 2 levels of nested child blocks.`;
                console.error(error);
                throw new Error(error);
            }

            const newBlock = block[blockType].createBlock(options);
            if (!newBlock[blockType].supports_children) {
                const error = `startParent() called with type ${blockType}, which does not support child blocks.`;
                console.error(error);
                throw new Error(error);
            }

            if (!newBlock[blockType].children) {
                newBlock[blockType].children = [];
            }

            currentBlockStack[currentBlockStack.length - 1].children.push(
                newBlock
            );
            currentBlockStack.push({
                block: newBlock,
                children: newBlock[blockType].children,
            });
            nestingLevel++;
            hasBlock = true;
            return this;
        },

        /**
         * Ends the current parent block and moves up one level in the block hierarchy.
         *
         * @returns {Object} The builder instance for method chaining.
         * @example
         * notion.startParent('toggle', 'Click to expand')
         *       .paragraph('This is inside the toggle')
         *       .endParent();
         */
        endParent() {
            if (currentBlockStack.length > 1) {
                currentBlockStack.pop();
                nestingLevel--;
            }
            return this;
        },

        /**
         * Adds a new block to the current level in the block hierarchy.
         *
         * @param {string} blockType - The type of block to add.
         * @param {Object} [options={}] - Options for creating the block, specific to the block type.
         * @returns {Object} The builder instance for method chaining.
         * @example
         * notion.addBlock('paragraph', 'This is a paragraph.');
         *
         * // Or using the shorthand method:
         * notion.paragraph('This is a paragraph.');
         */
        addBlock(blockType, options = {}) {
            const newBlock = block[blockType].createBlock(options);
            currentBlockStack[currentBlockStack.length - 1].children.push(
                newBlock
            );
            hasBlock = true;
            return this;
        },

        /**
         * Adds a paragraph block to the current stack.
         * @see block.paragraph.createBlock for full documentation
         */
        paragraph(options) {
            return this.addBlock("paragraph", options);
        },

        /**
         * Adds a heading_1 block to the current stack.
         * @see block.heading_1.createBlock for full documentation
         */
        heading1(options) {
            return this.addBlock("heading_1", options);
        },

        /**
         * Adds a heading_2 block to the current stack.
         * @see block.heading_2.createBlock for full documentation
         */
        heading2(options) {
            return this.addBlock("heading_2", options);
        },

        /**
         * Adds a heading_3 block to the current stack.
         * @see block.heading_3.createBlock for full documentation
         */
        heading3(options) {
            return this.addBlock("heading_3", options);
        },

        /**
         * Adds a bulleted_list_item block to the current stack.
         * @see block.bulleted_list_item.createBlock for full documentation
         */
        bulletedListItem(options) {
            return this.addBlock("bulleted_list_item", options);
        },

        /**
         * Adds a numbered_list_item block to the current stack.
         * @see block.numbered_list_item.createBlock for full documentation
         */
        numberedListItem(options) {
            return this.addBlock("numbered_list_item", options);
        },

        /**
         * Adds a to_do block to the current stack.
         * @see block.to_do.createBlock for full documentation
         */
        toDo(options) {
            return this.addBlock("to_do", options);
        },

        /**
         * Adds a toggle block to the current stack.
         * @see block.toggle.createBlock for full documentation
         */
        toggle(options) {
            return this.addBlock("toggle", options);
        },

        /**
         * Adds a code block to the current stack.
         * @see block.code.createBlock for full documentation
         */
        code(options) {
            return this.addBlock("code", options);
        },

        /**
         * Adds a quote block to the current stack.
         * @see block.quote.createBlock for full documentation
         */
        quote(options) {
            return this.addBlock("quote", options);
        },

        /**
         * Adds a callout block to the current stack.
         * @see block.callout.createBlock for full documentation
         */
        callout(options) {
            return this.addBlock("callout", options);
        },

        /**
         * Adds a divider block to the current stack.
         * @see block.divider.createBlock for full documentation
         */
        divider() {
            return this.addBlock("divider", {});
        },

        /**
         * Adds an image block to the current stack.
         * @see block.image.createBlock for full documentation
         */
        image(options) {
            return this.addBlock("image", options);
        },

        /**
         * Adds a video block to the current stack.
         * @see block.video.createBlock for full documentation
         */
        video(options) {
            return this.addBlock("video", options);
        },

        /**
         * Adds a file block to the current stack.
         * @see block.file.createBlock for full documentation
         */
        file(options) {
            return this.addBlock("file", options);
        },

        /**
         * Adds a pdf block to the current stack.
         * @see block.pdf.createBlock for full documentation
         */
        pdf(options) {
            return this.addBlock("pdf", options);
        },

        /**
         * Adds a bookmark block to the current stack.
         * @see block.bookmark.createBlock for full documentation
         */
        bookmark(options) {
            return this.addBlock("bookmark", options);
        },

        /**
         * Adds an embed block to the current stack.
         * @see block.embed.createBlock for full documentation
         */
        embed(options) {
            return this.addBlock("embed", options);
        },

        /**
         * Adds a table_of_contents block to the current stack.
         * @see block.table_of_contents.createBlock for full documentation
         */
        tableOfContents(options) {
            return this.addBlock("table_of_contents", options);
        },

        /**
         * Adds a table block to the current stack.
         * @see block.table.createBlock for full documentation
         */
        table(options) {
            return this.addBlock("table", options);
        },

        /**
         * Adds a table_row block to the current stack.
         * @see block.table_row.createBlock for full documentation
         */
        tableRow(options) {
            return this.addBlock("table_row", options);
        },

        /**
         * Builds and returns the final Notion object based on the current state of the builder.
         *
         * @returns {Object} An object containing the built content and any additional blocks.
         * @property {Object|Array} content - The main content of the built object. This can be a full page object, a properties object, or an array of blocks, depending on what was added to the builder.
         * @property {Array} additionalBlocks - Any blocks that exceed Notion's maximum block limit per request. These will need to be added in subsequent requests.
         * @throws {Error} If no data was added to the builder.
         * @example
         * const notion = createNotion();
         * const result = notion
         *   .dbId('your-database-id')
         *   .title('Page Title', 'My New Page')
         *   .paragraph('This is a paragraph.')
         *   .build();
         *
         * console.log(result.content);  // The main page content
         * console.log(result.additionalBlocks);  // Any blocks that couldn't fit in the initial request
         */
        build() {
            let result = {
                content: null,
                additionalBlocks: [],
            };

            if (hasPageParent) {
                if (data.children.length > CONSTANTS.MAX_BLOCKS) {
                    const chunkedBlocks = chunkBlocks(data.children);
                    data.children = chunkedBlocks[0];
                    result.additionalBlocks = chunkedBlocks.slice(1);
                }
                result.content = data;
            } else if (hasProperty && !hasBlock) {
                result.content = data.properties;
            } else if (hasBlock && !hasProperty) {
                if (data.children.length > CONSTANTS.MAX_BLOCKS) {
                    const chunkedBlocks = chunkBlocks(data.children);
                    result.content = chunkedBlocks[0];
                    result.additionalBlocks = chunkedBlocks.slice(1);
                } else {
                    result.content = data.children;
                }
            } else if (!hasPageParent && hasProperty && hasBlock) {
                console.warn(
                    `Properties and blocks were added, so a full page object will be returned. However, it has no parent page or database specified.`
                );
                if (data.children.length > CONSTANTS.MAX_BLOCKS) {
                    const chunkedBlocks = chunkBlocks(data.children);
                    data.children = chunkedBlocks[0];
                    result.additionalBlocks = chunkedBlocks.slice(1);
                }
                result.content = data;
            } else if (!hasPageParent && !hasProperty && !hasBlock) {
                const error = `No data was added to the builder.`;
                console.error(error);
                throw new Error(error);
            }

            resetBuilder();
            return result;
        },

        /**
         * Resets the builder to its initial state, clearing all added content.
         *
         * @returns {Object} The builder instance for method chaining.
         * @example
         * const notion = createNotion();
         * notion
         *   .dbId('your-database-id')
         *   .title('Page Title', 'My New Page')
         *   .paragraph('This is a paragraph.')
         *   .build();
         *
         * // Reset the builder for a new page
         * notion.reset()
         *   .dbId('another-database-id')
         *   .title('Page Title', 'Another New Page')
         *   .build();
         */
        reset() {
            resetBuilder();
            return this;
        },
    };
}
