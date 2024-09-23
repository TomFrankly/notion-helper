import { buildRichTextObj } from "./rich-text.mjs";
import { makeParagraphBlocks } from "./blocks.mjs";
import { page_meta, page_props } from "./page-meta.mjs";
import { block } from "./blocks.mjs";
import CONSTANTS from "./constants.mjs";
import { enforceStringLength } from "./utils.mjs";

// TODO - allow passing in a Notion db response in order to validate against the db itself
// TODO - allow passing in a request callback function so the library can make API requests for you
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
            ...(icon && { icon: page_meta.icon.createMeta(icon) }),
            ...(cover && { cover: page_meta.cover.createMeta(cover) }),
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

                const propResult = page_props[propType].setProp(value);

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

/**
 * A builder object for Notion content.
 * @typedef {Object} NotionBuilder
 * 
 * @property {function(string): this} parentDb - Sets the parent database for the page.
 * @property {function(string): this} parentPage - Sets the parent page for the page.
 * // Add more properties here for each method in the builder
 */

/**
 * A factory function that provides methods for building Notion objects, including pages, properties, and blocks. It adds an unhealthily-large spoonful of syntactic sugar onto the Notion API.
 * 
 * Returns an object with two possible properties:
 * 
 * 1. content (always returned) - can be a full page object, an array of blocks, or a properties object.
 * 
 * 2. addititionalBlocks - array containing arrays of blocks passed to the builder function that go over Notion's limit for the number of blocks that can be in a children array. This allows you to add these to the returned page or block in further requests.
 *
 * This builder supports chaining methods so you can build pages or structures incrementally. It also supports block-nesting with the startParent() and endParent() methods.
 * 
 * After adding all your blocks and properties, call build() to return the final object. It can be passed directly as the data object in Notion API requests.
 *
 * @namespace
 * @function createNotion
 * @returns {NotionBuilder} A builder object with methods for constructing and managing Notion content. The builder includes methods to set page and property details, add various block types, manage nested structures, and ultimately build Notion-compatible objects.
 *
 * @example
 * const notionBuilder = createNotion();
 *
 * // Build a new Notion page with various blocks
 * const result = notionBuilder
 *   .parentDb('database-id')
 *   .title('Page Title', 'Hello World')
 *   .paragraph('This is the first paragraph.')
 *   .heading1('Main Heading')
 *   .build();
 *
 * // Access the built content and handle additional blocks if they exist
 * console.log(result.content);  // The main Notion page content
 * console.log(result.additionalBlocks);  // Any blocks that need separate requests due to size constraints
 * 
 * // Create a page in Notion with the result (assumes you've installed and imported the Notion SDK and instantiated a client bound to a 'notion' variable)
 * const response = await notion.pages.create(result.content)
 */
export function createNotion({ strict = false, nestingLimit = 2 } = {}) {
    let data,
        currentBlockStack,
        nestingLevel,
        hasPageParent,
        hasPageId,
        hasBlockId,
        hasProperty,
        hasBlock,
        nullParent

    /**
     * Resets the builder to its initial state.
     * @private
     */
    function resetBuilder() {
        data = {
            properties: {},
            children: [],
        };
        currentBlockStack = [{ block: data, children: data.children }];
        nestingLevel = 0;
        hasPageParent = false;
        hasProperty = false;
        hasBlock = false;
        nullParent = false;
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
            chunkedBlocks.push(blocks.slice(i, i + chunkSize));
        }
        return chunkedBlocks;
    }

    /**
     * Removes keys from the property object if their object's only key is null.
     * Essentially removes props that were created, but with null values.
     * 
     * @private
     * @param {Object} propertyObj - a property object
     */
    function removeNullProps(propertyObj) {
        for (let key in propertyObj) {
            if (typeof propertyObj[key] === "object" && propertyObj[key] !== null) {
                const subKeys = Object.keys(propertyObj[key])
                if (subKeys.length === 1 && propertyObj[key][subKeys[0]] === null) {
                    delete propertyObj[key]
                }
            }
        }
    }

    resetBuilder();

    /**
     * @namespace
     * @type {NotionBuilder} */
    const builder = {
        // Page Methods
        /**
         * Sets the parent database for the page.
         * @param {string} database_id - The ID of the parent database.
         * @returns {this} The builder instance for method chaining.
         */
        parentDb(database_id) {
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
         * @returns {this} The builder instance for method chaining.
         */
        parentPage(page_id) {
            data.parent = page_meta.parent.createMeta({
                id: page_id,
                type: "page_id",
            });
            hasPageParent = true;
            nestingLevel++;
            return this;
        },

        /**
         * Adds a page_id property. Used for updating page properties or doing read operations.
         * @param {string} page_id - The ID of the page
         * @returns {this} The builder instance for method chaining.
         */
        pageId(page_id) {
            data.page_id = page_meta.page.createMeta(page_id);
            hasPageId = true;
            return this;
        },

        /**
         * Adds a property_id property. Used for fetching a page property item.
         * @param {string} property_id - The ID of the property to be fetched.
         * @returns {this} The builder instance for method chaining.
         */
        propertyId(property_id) {
            data.property_id = page_meta.property.createMeta(property_id);
            return this;
        },

        /**
         * Adds a block_id property. Used for all Block endpoints.
         * @param {string} block_id - The ID of the block
         * @returns {this} The builder instance for method chaining.
         */
        blockId(block_id) {
            data.block_id = page_meta.block.createMeta(block_id);
            hasBlockId = true;
            nestingLevel++;
            return this;
        },

        /**
         * Sets the cover image for the page.
         * @param {string} url - The URL of the cover image.
         * @returns {this} The builder instance for method chaining.
         */
        cover(url) {
            if (url === undefined || url === null || url === "") {
                return this
            }

            data.cover = page_meta.cover.createMeta(url);
            return this;
        },

        /**
         * Sets the icon for the page.
         * @param {string} url - The URL of the icon image or an emoji.
         * @returns {this} The builder instance for method chaining.
         */
        icon(url) {
            if (url === undefined || url === null || url === "") {
                return this
            }

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
         * @returns {this} The builder instance for method chaining.
         */
        property(name, type, value) {
            if (!page_props[type]) {
                const error = `Invalid property type: ${type}`;
                console.error(error);
                throw new Error(error);
            }

            if (name === undefined || name === null || type === undefined || type === null || value === undefined || value === null) {
                if (strict === true) {
                    const error = `Null or invalid property name, type, or value provided.\n\nName: ${name}\nType: ${type}\nValue: ${value}\n\nStrict mode is enabled, so cannot construct property object. Disable strict mode in createNotion() to simply ignore this property method call.`
                    console.error(error)
                    throw new Error(error)
                } else {
                    console.warn(`Null or invalid property name, type, or value provided.\n\nName: ${name}\nType: ${type}\nValue: ${value}\n\nThis method call will be ignored. You can instead cause createNotion() to throw an error in instance like these by calling createNotion(strict = true)`)
                    return this
                }
            }

            data.properties[name] = page_props[type].setProp(value);
            hasProperty = true;
            return this;
        },

        /**
         * Sets a title property value for the page.
         * @param {string} name - The name of the property.
         * @param {string|Array} value - The title value.
         * @returns {this} The builder instance for method chaining.
         */
        title(name, value) {
            if (value === undefined || value === null) {
                return this
            } else {
                return this.property(name, "title", value)
            }
        },

        /**
         * Sets a rich text property value for the page.
         * @param {string} name - The name of the property.
         * @param {string|Array} value - The rich text value.
         * @returns {this} The builder instance for method chaining.
         */
        richText(name, value) {
            if (value === undefined || value === null) {
                return this
            } else {
                return this.property(name, "rich_text", value)
            }
        },

        /**
         * Sets a checkbox property value for the page.
         * @param {string} name - The name of the property.
         * @param {boolean} value - The checkbox value.
         * @returns {this} The builder instance for method chaining.
         */
        checkbox(name, value) {
            if (value === undefined || value === null) {
                return this
            } else {
                return this.property(name, "checkbox", value)
            }
        },

        /**
         * Sets a date property value for the page.
         * @param {string} name - The name of the property.
         * @param {string} start - The start date.
         * @param {string} [end=null] - The end date (optional).
         * @returns {this} The builder instance for method chaining.
         */
        date(name, start, end = null) {
            if (start === undefined || start === null) {
                return this
            } else {
                data.properties[name] = page_props.date.setProp(start, end);
                hasProperty = true;
                return this;
            }
        },

        /**
         * Sets a email property value for the page.
         * @param {string} name - The name of the property.
         * @param {string} value - The email value.
         * @returns {this} The builder instance for method chaining.
         */
        email(name, value) {
            if (value === undefined || value === null) {
                return this
            } else {
                return this.property(name, "email", value)
            }
        },

        /**
         * Sets a files property value for the page.
         *
         * NOTE: The separate file() method creates a file block.
         *
         * @param {string} name - The name of the property.
         * @param {(string|Array)} files - An array of file objects, or a url string
         * @returns {this} The builder instance for method chaining.
         */
        files(name, files) {
            if (files === undefined || files === null) {
                return this
            } else {
                return this.property(name, "files", files)
            }
        },

        /**
         * Sets a multi-select property value for the page.
         * @param {string} name - The name of the property.
         * @param {(string|Array)} values - A string or array of values.
         * @returns {this} The builder instance for method chaining.
         */
        multiSelect(name, values) {
            if (values === undefined || values === null) {
                return this
            } else {
                return this.property(name, "multi_select", values)
            }
        },

        /**
         * Sets a number property value for the page.
         * @param {string} name - The name of the property.
         * @param {number} value - The number value.
         * @returns {this} The builder instance for method chaining.
         */
        number(name, value) {
            if (value === undefined || value === null) {
                return this
            } else {
                return this.property(name, "number", value)
            }
        },

        /**
         * Sets a people property value for the page.
         * @param {string} name - The name of the property.
         * @param {(string|Array)} people - A person ID string or array of person IDs.
         * @returns {this} The builder instance for method chaining.
         */
        people(name, people) {
            if (people === undefined || people === null) {
                return this
            } else {
                return this.property(name, "people", people)
            }
        },

        /**
         * Sets a phone number property value for the page.
         * @param {string} name - The name of the property.
         * @param {string} value - The phone number value.
         * @returns {this} The builder instance for method chaining.
         */
        phoneNumber(name, value) {
            if (value === undefined || value === null) {
                return this
            } else {
                return this.property(name, "phone_number", value)
            }
        },

        /**
         * Sets a relation property value for the page.
         * @param {string} name - The name of the property.
         * @param {(string|Array)} pages - A page ID or an array of page IDs.
         * @returns {this} The builder instance for method chaining.
         */
        relation(name, pages) {
            if (pages === undefined || pages === null) {
                return this
            } else {
                return this.property(name, "relation", pages)
            }
        },

        /**
         * Sets a select property value for the page.
         * @param {string} name - The name of the property.
         * @param {string} value - The selected value.
         * @returns {this} The builder instance for method chaining.
         */
        select(name, value) {
            if (value === undefined || value === null) {
                return this
            } else {
                return this.property(name, "select", value)
            }
        },

        /**
         * Sets a status property value for the page.
         * @param {string} name - The name of the property.
         * @param {string} value - The status value.
         * @returns {this} The builder instance for method chaining.
         */
        status(name, value) {
            if (value === undefined || value === null) {
                return this
            } else {
                return this.property(name, "status", value)
            }
        },

        /**
         * Sets a URL property value for the page.
         * @param {string} name - The name of the property.
         * @param {string} value - The URL value.
         * @returns {this} The builder instance for method chaining.
         */
        url(name, value) {
            if (value === undefined || value === null) {
                return this
            } else {
                return this.property(name, "url", value)
            }
        },

        // Block Methods
        /**
         * Starts a new parent block that can contain child blocks.
         *
         * @param {string} blockType - The type of block to create as a parent.
         * @param {Object} [options={}] - Options for creating the block, specific to the block type.
         * @throws {Error} If the nesting level exceeds 2 or if the block type doesn't support children.
         * @returns {this} The builder instance for method chaining.
         * @example
         * notion.startParent('toggle', 'Click to expand')
         *       .paragraph('This is inside the toggle')
         *       .endParent();
         */
        startParent(blockType, options = {}) {
            if (blockType === undefined || blockType === null || options === undefined || options === null || Object.keys(options).length < 1) {
                if (strict === true) {
                    const error = `Null/undefined block type, or null/undefined options provided to startParent():\n\nBlock type: ${blockType}\nOptions: ${options}\n\nStrict mode is enabled, so this method is throwing an error. You can call createNotion() without the strict argument if you\'d just like this method call to be ignored instead.`
                    console.error(error)
                    throw new Error(error)
                } else {
                    const warning = `Null/undefined block type, or null/undefined options provided to startParent():\n\nBlock type: ${blockType}\nOptions: ${options}\n\nStrict mode is disabled, so this method call will simply be ignored. Calling endparent() may result in an error, though the library will try to prevent this.`
                    console.warn(warning)
                    nullParent = true
                    return this
                }
            }
            
            if (nestingLevel > nestingLimit) {
                const error = `Nesting level exceeded. Requests can only have ${nestingLimit} levels of nested child blocks.`;
                console.error(error);
                throw new Error(error);
            }

            const newBlock = block[blockType].createBlock(options);
            if (!block[blockType].supports_children) {
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
         * @returns {this} The builder instance for method chaining.
         * @example
         * notion.startParent('toggle', 'Click to expand')
         *       .paragraph('This is inside the toggle')
         *       .endParent();
         */
        endParent() {
            if (nullParent == true) {
                nullParent = false
                return this
            }

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
         * @returns {this} The builder instance for method chaining.
         * @example
         * notion.addBlock('paragraph', 'This is a paragraph.');
         *
         * // Or using the shorthand method:
         * notion.paragraph('This is a paragraph.');
         */
        addBlock(blockType, options = {}) {
            if (blockType === undefined || blockType === null || options === undefined || options === null || Object.keys(options).length < 1) {
                if (strict === true) {
                    const error = `Null/undefined block type, or null/undefined options provided to addBlock():\n\nBlock type: ${blockType}\nOptions: ${options}\n\nStrict mode is enabled, so this method is throwing an error. You can call createNotion() without the strict argument if you\'d just like this method call to be ignored instead.`
                    console.error(error)
                    throw new Error(error)
                } else {
                    const warning = `Null/undefined block type, or null/undefined options provided to addBlock():\n\nBlock type: ${blockType}\nOptions: ${options}\n\nStrict mode is disabled, so this method call will simply be ignored.`
                    console.warn(warning)
                    nullParent = true
                    return this
                }
            }
            
            const newBlock = block[blockType].createBlock(options);
            currentBlockStack[currentBlockStack.length - 1].children.push(
                newBlock
            );
            hasBlock = true;
            return this;
        },

        /**
         * Adds a paragraph block to the current stack.
         * If this method recieves a string over the max character length, it will split it and
         * add multiple paragraph blocks to the stack. This differs from the other block methods,
         * which will instead split long strings into an array of multiple rich_text objects.
         * 
         * If you prefer that behavior for paragraphs, you can import enforceStringLength()
         * yourself, run your string through it, then pass the returned array to this method.
         * 
         * @returns {this} The builder instance for method chaining.
         * @see block.paragraph.createBlock for full documentation
         */
        paragraph(options) {
            if (typeof options === "string" && options.length > CONSTANTS.MAX_TEXT_LENGTH) {
                const strings = enforceStringLength(options).filter(Boolean)
                strings.forEach((string) => this.addBlock("paragraph", string))
                return this
            } else {
                return this.addBlock("paragraph", options);
            }
        },

        /**
         * Adds a heading_1 block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.heading_1.createBlock for full documentation
         */
        heading1(options) {
            let value

            if (typeof options === "string" && options.length > CONSTANTS.MAX_TEXT_LENGTH) {
                value = enforceStringLength(options).filter(Boolean)
            } else {
                value = options
            }
            
            return this.addBlock("heading_1", value);
        },

        /**
         * Adds a heading_2 block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.heading_2.createBlock for full documentation
         */
        heading2(options) {
            let value

            if (typeof options === "string" && options.length > CONSTANTS.MAX_TEXT_LENGTH) {
                value = enforceStringLength(options).filter(Boolean)
            } else {
                value = options
            }
            
            return this.addBlock("heading_2", value);
        },

        /**
         * Adds a heading_3 block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.heading_3.createBlock for full documentation
         */
        heading3(options) {
            let value

            if (typeof options === "string" && options.length > CONSTANTS.MAX_TEXT_LENGTH) {
                value = enforceStringLength(options).filter(Boolean)
            } else {
                value = options
            }

            return this.addBlock("heading_3", value);
        },

        /**
         * Adds a bulleted_list_item block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.bulleted_list_item.createBlock for full documentation
         */
        bulletedListItem(options) {
            let value

            if (typeof options === "string" && options.length > CONSTANTS.MAX_TEXT_LENGTH) {
                value = enforceStringLength(options).filter(Boolean)
            } else {
                value = options
            }

            return this.addBlock("bulleted_list_item", value);
        },

        /**
         * Shorthand alias for bulletedListItem(). Adds a bulleted_list_item block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.bulleted_list_item.createBlock for full documentation
         */
        bullet(options) {
            return this.bulletedListItem(options);
        },

        /**
         * Adds a numbered_list_item block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.numbered_list_item.createBlock for full documentation
         */
        numberedListItem(options) {
            let value

            if (typeof options === "string" && options.length > CONSTANTS.MAX_TEXT_LENGTH) {
                value = enforceStringLength(options).filter(Boolean)
            } else {
                value = options
            }

            return this.addBlock("numbered_list_item", value);
        },

        /**
         * Shorthand alias for numberedListItem(). Added a numbered_list_item block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.numbered_list_item.createBlock for full documentation
         */
        num(options) {
            return this.numberedListItem(options);
        },

        /**
         * Adds a to_do block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.to_do.createBlock for full documentation
         */
        toDo(options) {
            let value

            if (typeof options === "string" && options.length > CONSTANTS.MAX_TEXT_LENGTH) {
                value = enforceStringLength(options).filter(Boolean)
            } else {
                value = options
            }
            
            return this.addBlock("to_do", value);
        },

        /**
         * Adds a toggle block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.toggle.createBlock for full documentation
         */
        toggle(options) {
            let value

            if (typeof options === "string" && options.length > CONSTANTS.MAX_TEXT_LENGTH) {
                value = enforceStringLength(options).filter(Boolean)
            } else {
                value = options
            }
            
            return this.addBlock("toggle", value);
        },

        /**
         * Adds a code block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.code.createBlock for full documentation
         */
        code(options) {
            let value

            if (typeof options === "string" && options.length > CONSTANTS.MAX_TEXT_LENGTH) {
                value = enforceStringLength(options).filter(Boolean)
            } else {
                value = options
            }
            
            return this.addBlock("code", value);
        },

        /**
         * Adds a quote block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.quote.createBlock for full documentation
         */
        quote(options) {
            let value

            if (typeof options === "string" && options.length > CONSTANTS.MAX_TEXT_LENGTH) {
                value = enforceStringLength(options).filter(Boolean)
            } else {
                value = options
            }
            
            return this.addBlock("quote", value);
        },

        /**
         * Adds a callout block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.callout.createBlock for full documentation
         */
        callout(options) {
            let value

            if (typeof options === "string" && options.length > CONSTANTS.MAX_TEXT_LENGTH) {
                value = enforceStringLength(options).filter(Boolean)
            } else {
                value = options
            }

            return this.addBlock("callout", value);
        },

        /**
         * Adds a divider block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.divider.createBlock for full documentation
         */
        divider() {
            return this.addBlock("divider", {});
        },

        /**
         * Adds an image block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.image.createBlock for full documentation
         */
        image(options) {
            return this.addBlock("image", options);
        },

        /**
         * Adds a video block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.video.createBlock for full documentation
         */
        video(options) {
            return this.addBlock("video", options);
        },

        /**
         * Adds a file block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.file.createBlock for full documentation
         */
        file(options) {
            return this.addBlock("file", options);
        },

        /**
         * Adds a pdf block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.pdf.createBlock for full documentation
         */
        pdf(options) {
            return this.addBlock("pdf", options);
        },

        /**
         * Adds a bookmark block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.bookmark.createBlock for full documentation
         */
        bookmark(options) {
            return this.addBlock("bookmark", options);
        },

        /**
         * Adds an embed block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.embed.createBlock for full documentation
         */
        embed(options) {
            return this.addBlock("embed", options);
        },

        /**
         * Adds a table_of_contents block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.table_of_contents.createBlock for full documentation
         */
        tableOfContents(options) {
            return this.addBlock("table_of_contents", options);
        },

        /**
         * Adds a table block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.table.createBlock for full documentation
         */
        table(options) {
            return this.addBlock("table", options);
        },

        /**
         * Adds a table_row block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.table_row.createBlock for full documentation
         */
        tableRow(options) {
            return this.addBlock("table_row", options);
        },

        /**
         * Adds a block to the stack for each element in the passed array.
         * @returns {this} The builder instance for method chaining.
         */
        loop(blockTypeOrCallback, arr) {
            if (arr === undefined || arr === null || arr.length < 1) {
                return this
            }
            
            if (typeof blockTypeOrCallback === 'function') {
                arr.forEach((element, index) => {
                    blockTypeOrCallback(this, element, index)
                })
            } else {
                arr.forEach((element) => {
                    this.addBlock(blockTypeOrCallback, element)
                })
            }
            return this
        },

        /**
         * Builds and returns the final Notion object based on the current state of the builder.
         *
         * @returns {this} An object containing the built content and any additional blocks.
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

            if (hasProperty) {
                removeNullProps(data.properties)
            }

            if (hasPageParent) {
                if (data.children.length > CONSTANTS.MAX_BLOCKS) {
                    const chunkedBlocks = chunkBlocks(data.children);
                    data.children = chunkedBlocks[0];
                    result.additionalBlocks = chunkedBlocks.slice(1);
                }
                const { parent, ...rest } = data;
                result.content = parent ? { parent, ...rest } : data;
            } else if (hasPageId) {
                if (data.children.length > CONSTANTS.MAX_BLOCKS) {
                    const chunkedBlocks = chunkBlocks(data.children);
                    data.children = chunkedBlocks[0];
                    result.additionalBlocks = chunkedBlocks.slice(1);
                }
                const { page_id, ...rest } = data;
                result.content = page_id ? { page_id, ...rest } : data;
            } else if (hasBlockId) {
                if (data.children.length > CONSTANTS.MAX_BLOCKS) {
                    const chunkedBlocks = chunkBlocks(data.children);
                    data.children = chunkedBlocks[0];
                    result.additionalBlocks = chunkedBlocks.slice(1);
                }
                const { block_id, ...rest } = data;
                result.content = block_id ? { block_id, ...rest } : data;
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
         * Creates a new page in Notion using user-provided callback functions for page creation and block-append operations.
         * 
         * @param {*} creationCallback 
         * @param {*} appendCallback 
         */
        createPage(creationCallback, appendCallback) {
            // Call this.build() directly if possible
            // Should use underlying API methods for creation and appending
        },

        /**
         * Resets the builder to its initial state, clearing all added content.
         *
         * @returns {this} The builder instance for method chaining.
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

    return builder;
}
