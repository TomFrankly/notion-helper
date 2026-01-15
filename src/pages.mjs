import { buildRichTextObj } from "./rich-text.mjs";
import { makeParagraphBlocks } from "./blocks.mjs";
import { page_meta, page_props } from "./page-meta.mjs";
import { block } from "./blocks.mjs";
import CONSTANTS from "./constants.mjs";
import { enforceStringLength, validateAndSplitBlock, isValidUUID } from "./utils.mjs";

// TODO - allow passing in a Notion db response in order to validate against the db itself
// TODO - allow passing in a request callback function so the library can make API requests for you
// TODO - probably split out schema validation as its own function

/**
 *
 * @param {Object} options
 * @param {string} parent - The ID of the parent page or database.
 * @param {string} parent_type - "page_id", "data_source_id", or "database_id". (database_id is deprecated and will not work in databases with more than one data source.)
 * @param {(Array<Object>|Object)} pages - an array of simple objects, each of which will be turned into a valid page object. Each can have property types that match to valid Notion page properties, as well as a "cover", "icon", and "children" property. The "children" prop's value should be either a string or an array. You can also pass a single object, but the function will still return an array.
 * @param {Object} schema - an object that maps the schema of the pages objects to property names and types in the parent. Saves you from needing to specify the property name and type from the target Notion database for every entry in your pages object. For each property in your pages object that should map to a Notion database property, specify the key as the property name in the pages object and set the value as an array with the Notion property name as the first element and the property type as the second. Non-valid property types will be filtered out. Optionall, you can specify custom keys for the icon (["Icon", "icon"]), cover (["Cover", "cover"]), and children array (["Children", "children"]).
 * @param {function} childrenFn - a callback you can specify that will run on any array elements present in a "children" property of any object in the pages array. If that "children" property contains a single string, it'll run on that as well. If omitted, any "children" values will be converted to Paragraph blocks by default.
 *
 * @example
 * const dataSource = "abcdefghijklmnopqrstuvwxyz"
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
 *      parent: dataSource,
 *      parent_type: "data_source_id",
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
 * A builder object for Notion content with fluent interface methods.
 * @typedef {Object} NotionBuilder
 * @example
 * const notionBuilder = createNotionBuilder();
 * 
 * // Build a new Notion page with various blocks
 * const result = notionBuilder
 *   .parentDataSource('data-source-id')
 *   .title('Page Title', 'Hello World')
 *   .paragraph('This is the first paragraph.')
 *   .heading1('Main Heading')
 *   .build();
 */

/**
 * Creates a fluent interface builder for constructing Notion objects, including pages, properties, and blocks. 
 * 
 * **Fluent Interface Methods:**
 * 
 * The returned builder provides chainable methods organized into categories:
 * 
 * **Page Setup Methods:**
 * - `parentDataSource(data_source_id)` - Sets parent data source
 * - `parentDs(data_source_id)` - Alias for parentDataSource()
 * - `parentPage(page_id)` - Sets parent page
 * - `parentDatabase(database_id)` - Sets parent database (deprecated, will not work in databases with more than one data source)
 * - `parentDb(database_id)` - Alias for parentDatabase() (deprecated, will not work in databases with more than one data source)
 * - `pageId(page_id)` - Adds page ID for updates
 * - `blockId(block_id)` - Adds block ID for block operations
 * - `propertyId(property_id)` - Adds property ID for property operations
 * - `cover(url)` - Sets page cover image
 * - `icon(url)` - Sets page icon
 * - `position(positionChoice)` - Sets position within parent page (only valid when parent is a page)
 * 
 * **Property Methods:**
 * - `property(name, type, value)` - Adds custom property
 * - `title(name, value)` - Adds title property
 * - `richText(name, value)` - Adds rich text property
 * - `checkbox(name, value)` - Adds checkbox property
 * - `date(name, value)` - Adds date property
 * - `email(name, value)` - Adds email property
 * - `files(name, value)` - Adds files property
 * - `multiSelect(name, value)` - Adds multi-select property
 * - `number(name, value)` - Adds number property
 * - `people(name, value)` - Adds people property
 * - `phoneNumber(name, value)` - Adds phone number property
 * - `relation(name, value)` - Adds relation property
 * - `select(name, value)` - Adds select property
 * - `status(name, value)` - Adds status property
 * - `url(name, value)` - Adds URL property
 * 
 * **Block Methods:**
 * - `paragraph(content, options, url)` - Adds paragraph block
 * - `heading1(content, options, url)` - Adds H1 block
 * - `heading2(content, options, url)` - Adds H2 block
 * - `heading3(content, options, url)` - Adds H3 block
 * - `bulletedListItem(content, options, url)` - Adds bulleted list item
 * - `numberedListItem(content, options, url)` - Adds numbered list item
 * - `toDo(content, checked, options, url)` - Adds to-do block
 * - `callout(content, emoji, options, url)` - Adds callout block
 * - `quote(content, options, url)` - Adds quote block
 * - `code(content, language)` - Adds code block
 * - `divider()` - Adds divider block
 * - `image(url, caption)` - Adds image block
 * - `video(url, caption)` - Adds video block
 * - `audio(url, caption)` - Adds audio block
 * - `file(url, caption)` - Adds file block
 * - `pdf(url, caption)` - Adds PDF block
 * - `bookmark(url, caption)` - Adds bookmark block
 * - `embed(url, caption)` - Adds embed block
 * - `table(tableArray)` - Adds table block
 * - `tableRow(cellContents)` - Adds table row
 * - `columnList(columnArray)` - Adds column list
 * - `column(columnContent)` - Adds column
 * - `toggle(content, children, options, url)` - Adds toggle block
 * 
 * **Structure Management:**
 * - `startParent(parentBlock)` - Begins nested block structure
 * - `endParent()` - Ends current nesting level
 * - `build()` - Finalizes and returns the built object
 * 
 * **Return Object:**
 * 
 * Returns an object with two possible properties:
 * - `content` (always returned) - can be a full page object, an array of blocks, or a properties object
 * - `additionalBlocks` - array containing block chunks that exceed Notion's limits for subsequent requests
 *
 * @function createNotionBuilder
 * @param {Object} [options] - Configuration options for the builder
 * @param {boolean} [options.strict=false] If true, throws errors for invalid data. Otherwise gracefully handles nulls.
 * @param {boolean} [options.limitNesting=true] If true, limits nested children to 2 levels (Notion API limit).
 * @param {boolean} [options.limitChildren=true] If true, limits children arrays to 100 blocks, putting excess in additionalBlocks.
 * @param {boolean} [options.allowBlankParagraphs=false] If true, allows empty paragraph blocks.
 * @param {boolean} [options.handleTemplatePageChildren=false] If true, automatically moves all children blocks to additionalBlocks when a template is applied (type is not "none"). This is required because the Notion API doesn't allow children blocks in page creation requests that apply templates.
 * @returns {NotionBuilder} A builder object with fluent interface methods for constructing Notion content.
 * 
 * @example
 * // Basic page creation
 * const page = createNotionBuilder()
 *   .parentDataSource('data-source-id')
 *   .title('Name', 'My Task')
 *   .select('Status', 'In Progress')
 *   .date('Due Date', '2024-12-01')
 *   .paragraph('This is a task description.')
 *   .toDo('Complete the first step', false)
 *   .toDo('Review with team', false)
 *   .build();
 * 
 * // Complex nested structure
 * const complexPage = createNotionBuilder()
 *   .parentDataSource('data-source-id')
 *   .title('Project Name', 'Website Redesign')
 *   .heading1('Project Overview')
 *   .paragraph('This project involves redesigning our main website.')
 *   .heading2('Phase 1: Research')
 *   .startParent(toggle('Research Tasks', []))
 *     .toDo('Conduct user interviews', false)
 *     .toDo('Analyze competitor websites', false)
 *   .endParent()
 *   .heading2('Phase 2: Design')
 *   .callout('Important: Get stakeholder approval before development', '⚠️')
 *   .build();
 * 
 * // Handle large content with additionalBlocks
 * const result = page.content;
 * const extraBlocks = page.additionalBlocks;
 * 
 * // Create page first, then append additional blocks if needed
 * const notion = new Client({ auth: process.env.NOTION_TOKEN });
 * const newPage = await notion.pages.create(result);
 * 
 * if (extraBlocks && extraBlocks.length > 0) {
 *   for (const blockChunk of extraBlocks) {
 *     await notion.blocks.children.append({
 *       block_id: newPage.id,
 *       children: blockChunk
 *     });
 *   }
 * }
 * 
 * // Using template with automatic children handling
 * const templatePage = createNotionBuilder({ handleTemplatePageChildren: true })
 *   .parentDataSource('data-source-id')
 *   .template('default') // or template_id
 *   .title('Name', 'Task from Template')
 *   .paragraph('This content will be moved to additionalBlocks')
 *   .toDo('Complete task', false)
 *   .build();
 * 
 * // Create page with template, then append children
 * const notion = new Client({ auth: process.env.NOTION_TOKEN });
 * const newPage = await notion.pages.create(templatePage.content);
 * 
 * // Append the children that were moved to additionalBlocks
 * if (templatePage.additionalBlocks && templatePage.additionalBlocks.length > 0) {
 *   for (const blockChunk of templatePage.additionalBlocks) {
 *     await notion.blocks.children.append({
 *       block_id: newPage.id,
 *       children: blockChunk
 *     });
 *   }
 * }
 */
export function createNotionBuilder({
    strict = false,
    limitNesting = true,
    limitChildren = true,
    allowBlankParagraphs = false,
    handleTemplatePageChildren = false,
} = {}) {
    let data,
        currentBlockStack,
        nestingLevel,
        hasPageParent,
        parentIsDataSource,
        hasPageId,
        hasBlockId,
        hasProperty,
        hasBlock,
        nullParent;

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
        parentIsDataSource = false;
        hasProperty = false;
        hasBlock = false;
        nullParent = false;
    }

    /**
     * Recursively checks for table blocks without children.
     * @private
     * @param {Array} blocks - Array of blocks to check
     * @returns {Array} Array of error messages for tables without children
     */
    function validateTables(blocks) {
        const errors = [];
        
        function checkBlock(block) {
            if (!block || typeof block !== "object") return;
            
            if (block.type === "table") {
                const children = block.table?.children || [];
                if (children.length === 0) {
                    errors.push("Table block found without any children. Tables must have at least one table_row child.");
                }
            }
            
            // Recursively check children
            if (block.children && Array.isArray(block.children)) {
                block.children.forEach(checkBlock);
            }
            
            // Check children in block-specific locations
            if (block.table?.children) {
                block.table.children.forEach(checkBlock);
            }
            if (block.column_list?.children) {
                block.column_list.children.forEach(checkBlock);
            }
            if (block.column?.children) {
                block.column.children.forEach(checkBlock);
            }
            if (block.toggle?.children) {
                block.toggle.children.forEach(checkBlock);
            }
            if (block.callout?.children) {
                block.callout.children.forEach(checkBlock);
            }
            if (block.quote?.children) {
                block.quote.children.forEach(checkBlock);
            }
            if (block.bulleted_list_item?.children) {
                block.bulleted_list_item.children.forEach(checkBlock);
            }
            if (block.numbered_list_item?.children) {
                block.numbered_list_item.children.forEach(checkBlock);
            }
            if (block.to_do?.children) {
                block.to_do.children.forEach(checkBlock);
            }
        }
        
        if (Array.isArray(blocks)) {
            blocks.forEach(checkBlock);
        } else if (blocks && typeof blocks === "object") {
            checkBlock(blocks);
        }
        
        return errors;
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
            if (
                typeof propertyObj[key] === "object" &&
                propertyObj[key] !== null
            ) {
                const subKeys = Object.keys(propertyObj[key]);
                if (
                    subKeys.length === 1 &&
                    propertyObj[key][subKeys[0]] === null
                ) {
                    delete propertyObj[key];
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
         * Sets the parent database for the page. Deprecated in September 2025. Will not work in databases with more than one data source.
         * @param {string} database_id - The ID of the parent database.
         * @returns {this} The builder instance for method chaining.
         */
        parentDatabase(database_id) {
            data.parent = page_meta.parent.createMeta({
                id: database_id,
                type: "database_id",
            });
            hasPageParent = true;
            parentIsDataSource = true;
            return this;
        },

        /**
         * Alias for parentDatabase(). Sets the parent database for the page. Deprecated in September 2025. Will not work in databases with more than one data source.
         * @param {string} database_id - The ID of the parent database.
         * @returns {this} The builder instance for method chaining.
         */
        parentDb(database_id) {
            return this.parentDatabase(database_id);
        },

        /**
         * Sets the parent data source for the page.
         * @param {string} data_source_id - The ID of the parent data source.
         * @returns {this} The builder instance for method chaining.
         */
        parentDataSource(data_source_id) {
            data.parent = page_meta.parent.createMeta({ 
                id: data_source_id, 
                type: "data_source_id" 
            });
            hasPageParent = true;
            parentIsDataSource = true;
            return this;
        },

        /**
         * Alias for parentDataSource(). Sets the parent data source for the page.
         * @param {string} data_source_id - The ID of the parent data source.
         * @returns {this} The builder instance for method chaining.
         */
        parentDs(data_source_id) {
            return this.parentDataSource(data_source_id);
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
            return this;
        },

        /**
         * Sets the cover image for the page.
         * @param {string} url - The URL of the cover image.
         * @returns {this} The builder instance for method chaining.
         */
        cover(url) {
            if (url === undefined || url === null || url === "") {
                return this;
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
                return this;
            }

            data.icon = page_meta.icon.createMeta(url);
            return this;
        },

        /**
         * Sets a data source template for the page.
         *
         * @param {(Object|string)} templateChoice - The template to use for the page. Can be:
         *   - A fully-formed template object, e.g.:
         *     {
         *       type: "template_id",
         *       template_id: "your-template-id"
         *     }
         *   - A string value:
         *     - "none": Do not use a template.
         *     - "default": Use the default template, if available.
         *     - A valid template page ID (a valid UUID string).
         * @returns {this} The builder instance for method chaining.
         */
        template(templateChoice) {
            // Default to "none" if call is malformed
            if (templateChoice === undefined || templateChoice === null || typeof templateChoice !== "string" && typeof templateChoice !== "object") {
                console.warn("template() method called in builder without a valid template choice. Ignoring this method call.");
                return this;
            }

            data.template = page_meta.template.createMeta(templateChoice)
            return this;
        },

        /**
         * Sets the position for where the new page should be placed within its parent page.
         * This is only valid when the parent is a page (not a data source or database).
         * The position parameter is not allowed unless the parent is a page.
         *
         * @param {(Object|string)} positionChoice - The position to place the new page. Can be:
         *   - "page_start" (or "start", "top"): Place the page at the top of the parent.
         *   - "page_end" (or "end", "bottom"): Place the page at the bottom of the parent (default behavior).
         *   - A valid block ID (UUID string): Place the page after this specific block.
         *   - A fully-formed position object, e.g.:
         *     {
         *       type: "after_block",
         *       after_block: { id: "block-id" }
         *     }
         * @returns {this} The builder instance for method chaining.
         */
        position(positionChoice) {
            if (positionChoice === undefined || positionChoice === null || (typeof positionChoice !== "string" && typeof positionChoice !== "object")) {
                console.warn("position() method called in builder without a valid position choice. Ignoring this method call.");
                return this;
            }

            data.position = page_meta.position.createMeta(positionChoice);
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

            if (
                name === undefined ||
                name === null ||
                type === undefined ||
                type === null ||
                value === undefined ||
                value === null
            ) {
                if (strict === true) {
                    const error = `Null or invalid property name, type, or value provided.\n\nName: ${name}\nType: ${type}\nValue: ${value}\n\nStrict mode is enabled, so cannot construct property object. Disable strict mode in createNotionBuilder() to simply ignore this property method call.`;
                    console.error(error);
                    throw new Error(error);
                } else {
                    console.warn(
                        `Null or invalid property name, type, or value provided.\n\nName: ${name}\nType: ${type}\nValue: ${value}\n\nThis method call will be ignored. You can instead cause createNotionBuilder() to throw an error in instance like these by calling createNotionBuilder(strict = true)`
                    );
                    return this;
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
                return this;
            } else {
                return this.property(name, "title", value);
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
                return this;
            } else {
                return this.property(name, "rich_text", value);
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
                return this;
            } else {
                return this.property(name, "checkbox", value);
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
                return this;
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
                return this;
            } else {
                return this.property(name, "email", value);
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
                return this;
            } else {
                return this.property(name, "files", files);
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
                return this;
            } else {
                return this.property(name, "multi_select", values);
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
                return this;
            } else {
                return this.property(name, "number", value);
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
                return this;
            } else {
                return this.property(name, "people", people);
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
                return this;
            } else {
                return this.property(name, "phone_number", value);
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
                return this;
            } else {
                return this.property(name, "relation", pages);
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
                return this;
            } else {
                return this.property(name, "select", value);
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
                return this;
            } else {
                return this.property(name, "status", value);
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
                return this;
            } else {
                return this.property(name, "url", value);
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
            const optionlessBlockTypes = [
                "breadcrumb",
                "column_list",
                "column",
                "divider",
                "table",
            ];
            
            if (
                blockType === undefined ||
                blockType === null ||
                (
                    (
                        options === undefined ||
                        options === null ||
                        Object.keys(options).length < 1
                    ) &&
                    !optionlessBlockTypes.includes(blockType)
                )
            ) {
                if (strict === true) {
                    const error = `Null/undefined block type, or null/undefined options provided to startParent():\n\nBlock type: ${blockType}\nOptions: ${options}\n\nStrict mode is enabled, so this method is throwing an error. You can call createNotionBuilder() without the strict argument if you\'d just like this method call to be ignored instead.`;
                    console.error(error);
                    throw new Error(error);
                } else {
                    const warning = `Null/undefined block type, or null/undefined options provided to startParent():\n\nBlock type: ${blockType}\nOptions: ${options}\n\nStrict mode is disabled, so this method call will simply be ignored. Calling endparent() may result in an error, though the library will try to prevent this.`;
                    console.warn(warning);
                    nullParent = true;
                    return this;
                }
            }

            if (limitNesting === true && nestingLevel > 2) {
                const error = `Nesting level exceeded. Requests can only have 2 levels of nested child blocks.`;
                console.error(error);
                throw new Error(error);
            }

            if (!block[blockType].supports_children) {
                const error = `startParent() called with type ${blockType}, which does not support child blocks.`;
                console.error(error);
                throw new Error(error);
            }

            const newBlock = block[blockType].createBlock(options);

            if (!newBlock[blockType].hasOwnProperty("children")) {
                newBlock[blockType].children = [];
            }

            if (
                newBlock[blockType].hasOwnProperty("is_toggleable") &&
                newBlock[blockType].is_toggleable === false
            ) {
                newBlock[blockType].is_toggleable = true;
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
                nullParent = false;
                return this;
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
            const optionlessBlockTypes = [
                "breadcrumb",
                "column_list",
                "column",
                "divider",
                "table",
                "table_of_contents",
            ];

            if (typeof options === "number") {
                options = String(options);
            }

            if (
                blockType === undefined ||
                blockType === null ||
                (
                    (
                        options === undefined ||
                        options === null ||
                        Object.keys(options).length < 1
                    ) &&
                    !optionlessBlockTypes.includes(blockType)
                )
            ) {
                if (strict === true) {
                    const error = `Null/undefined block type, or null/undefined options provided to addBlock():\n\nBlock type: ${blockType}\nOptions: ${options}\n\nStrict mode is enabled, so this method is throwing an error. You can call createNotionBuilder() without the strict argument if you\'d just like this method call to be ignored instead.`;
                    console.error(error);
                    throw new Error(error);
                } else {
                    const warning = `Null/undefined block type, or null/undefined options provided to addBlock():\n\nBlock type: ${blockType}\nOptions: ${options}\n\nStrict mode is disabled, so this method call will simply be ignored.`;
                    console.warn(warning);
                    nullParent = true;
                    return this;
                }
            }

            const newBlock = block[blockType].createBlock(options);
            
            // If adding a table_row to a table parent, update table_width if needed
            if (blockType === "table_row" && currentBlockStack.length > 0) {
                const parentBlock = currentBlockStack[currentBlockStack.length - 1].block;
                if (parentBlock?.type === "table") {
                    const rowCells = newBlock?.table_row?.cells;
                    const rowWidth = rowCells && Array.isArray(rowCells) ? rowCells.length : 0;
                    const currentTableWidth = parentBlock?.table?.table_width ?? 0;
                    const currentChildrenCount = parentBlock?.table?.children?.length ?? 0;
                    
                    // If this is the first row, set or update table_width
                    if (currentChildrenCount === 0) {
                        if (currentTableWidth === 0) {
                            // Placeholder width - set from first row
                            parentBlock.table.table_width = rowWidth;
                        } else if (rowWidth > currentTableWidth) {
                            // First row has more columns than specified width - update and warn
                            console.warn(
                                `[NotionBuilder] First table row has ${rowWidth} columns, but table_width was set to ${currentTableWidth}. Updating table_width to ${rowWidth}.`
                            );
                            parentBlock.table.table_width = rowWidth;
                        }
                    }
                }
            }
            
            currentBlockStack[currentBlockStack.length - 1].children.push(
                newBlock
            );
            hasBlock = true;
            return this;
        },

        /**
         * Adds an existing Notion block to the current level in the block hierarchy.
         * This method is useful when you have a pre-constructed Notion block that you want to add directly.
         * The block will be automatically validated and split if it exceeds Notion API limits.
         *
         * @param {Object} existingBlock - A valid Notion block object to add.
         * @param {number} [limit] - Optional custom limit for text length validation.
         * @returns {this} The builder instance for method chaining.
         * @example
         * // Add a pre-constructed paragraph block
         * const myBlock = {
         *   type: "paragraph",
         *   paragraph: {
         *     rich_text: [{ type: "text", text: { content: "Hello" } }]
         *   }
         * };
         * notion.addExistingBlock(myBlock);
         * 
         * // Add a block with long text - will be automatically split if needed
         * const longBlock = {
         *   type: "heading_1",
         *   heading_1: {
         *     rich_text: [{ type: "text", text: { content: "Very long heading text..." } }]
         *   }
         * };
         * notion.addExistingBlock(longBlock); // May result in multiple blocks if split
         */
        addExistingBlock(existingBlock, limit) {
            if (!existingBlock || typeof existingBlock !== 'object' || !existingBlock.type) {
                if (strict === true) {
                    const error = `Invalid block provided to addExistingBlock():\n\nBlock: ${JSON.stringify(existingBlock)}\n\nStrict mode is enabled, so this method is throwing an error.`;
                    console.error(error);
                    throw new Error(error);
                } else {
                    const warning = `Invalid block provided to addExistingBlock():\n\nBlock: ${JSON.stringify(existingBlock)}\n\nStrict mode is disabled, so this method call will simply be ignored.`;
                    console.warn(warning);
                    nullParent = true;
                    return this;
                }
            }

            const validatedBlocks = validateAndSplitBlock(existingBlock, limit);
            
            for (const validatedBlock of validatedBlocks) {
                currentBlockStack[currentBlockStack.length - 1].children.push(validatedBlock);
            }
            
            hasBlock = true;
            return this;
        },

        /**
         * Adds a blank paragraph block to the current level in the block hierarchy.
         *
         * @returns {this} The builder instance for method chaining.
         * @example
         * notion.blank()
         */
        blank() {
            const newBlock = block.paragraph.createBlock("");
            currentBlockStack[currentBlockStack.length - 1].children.push(
                newBlock
            );
            hasBlock = true;
            return this;
        },

        /**
         * Adds a paragraph block to the current stack.
         *
         * If this method recieves a string over the max character length, it will split it and
         * add multiple paragraph blocks to the stack. This differs from the other block methods,
         * which will instead split long strings into an array of multiple rich_text objects.
         *
         * If you prefer that behavior for paragraphs, you can import enforceStringLength()
         * yourself, run your string through it, then pass the returned array to this method.
         *
         * If you allow for blank paragraph blocks, calling .paragraph("") or .paragraph()
         * will add a blank paragraph block to the current stack. You can do this with
         * createNotionBuilder({ allowBlankParagraphs: true }).
         *
         * If allowBlankParagraphs is false (the default):
         * - In strict mode, an error will be thrown.
         * - In non-strict mode (default), the call will simply not add a block to the stack.
         *
         * @returns {this} The builder instance for method chaining.
         * @see block.paragraph.createBlock for full documentation
         */
        paragraph(options) {
            if (
                typeof options === "string" &&
                options.length > CONSTANTS.MAX_TEXT_LENGTH
            ) {
                const strings = enforceStringLength(options).filter(Boolean);
                strings.forEach((string) => this.addBlock("paragraph", string));
                return this;
            } else if (
                ((typeof options === "string" && options === "") || !options) &&
                allowBlankParagraphs === true
            ) {
                return this.blank();
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
            let value;

            if (
                typeof options === "string" &&
                options.length > CONSTANTS.MAX_TEXT_LENGTH
            ) {
                value = enforceStringLength(options).filter(Boolean);
            } else {
                value = options;
            }

            return this.addBlock("heading_1", value);
        },

        /**
         * Adds a heading_2 block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.heading_2.createBlock for full documentation
         */
        heading2(options) {
            let value;

            if (
                typeof options === "string" &&
                options.length > CONSTANTS.MAX_TEXT_LENGTH
            ) {
                value = enforceStringLength(options).filter(Boolean);
            } else {
                value = options;
            }

            return this.addBlock("heading_2", value);
        },

        /**
         * Adds a heading_3 block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.heading_3.createBlock for full documentation
         */
        heading3(options) {
            let value;

            if (
                typeof options === "string" &&
                options.length > CONSTANTS.MAX_TEXT_LENGTH
            ) {
                value = enforceStringLength(options).filter(Boolean);
            } else {
                value = options;
            }

            return this.addBlock("heading_3", value);
        },

        /**
         * Adds a bulleted_list_item block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.bulleted_list_item.createBlock for full documentation
         */
        bulletedListItem(options) {
            let value;

            if (
                typeof options === "string" &&
                options.length > CONSTANTS.MAX_TEXT_LENGTH
            ) {
                value = enforceStringLength(options).filter(Boolean);
            } else {
                value = options;
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
            let value;

            if (
                typeof options === "string" &&
                options.length > CONSTANTS.MAX_TEXT_LENGTH
            ) {
                value = enforceStringLength(options).filter(Boolean);
            } else {
                value = options;
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
            let value;

            if (
                typeof options === "string" &&
                options.length > CONSTANTS.MAX_TEXT_LENGTH
            ) {
                value = enforceStringLength(options).filter(Boolean);
            } else {
                value = options;
            }

            return this.addBlock("to_do", value);
        },

        /**
         * Adds a toggle block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.toggle.createBlock for full documentation
         */
        toggle(options) {
            let value;

            if (
                typeof options === "string" &&
                options.length > CONSTANTS.MAX_TEXT_LENGTH
            ) {
                value = enforceStringLength(options).filter(Boolean);
            } else {
                value = options;
            }

            return this.addBlock("toggle", value);
        },

        /**
         * Adds a code block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.code.createBlock for full documentation
         */
        code(options) {
            let value;

            if (
                typeof options === "string" &&
                options.length > CONSTANTS.MAX_TEXT_LENGTH
            ) {
                value = enforceStringLength(options).filter(Boolean);
            } else {
                value = options;
            }

            return this.addBlock("code", value);
        },

        /**
         * Adds a quote block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.quote.createBlock for full documentation
         */
        quote(options) {
            let value;

            if (
                typeof options === "string" &&
                options.length > CONSTANTS.MAX_TEXT_LENGTH
            ) {
                value = enforceStringLength(options).filter(Boolean);
            } else {
                value = options;
            }

            return this.addBlock("quote", value);
        },

        /**
         * Adds a callout block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.callout.createBlock for full documentation
         */
        callout(options) {
            let value;

            if (
                typeof options === "string" &&
                options.length > CONSTANTS.MAX_TEXT_LENGTH
            ) {
                value = enforceStringLength(options).filter(Boolean);
            } else {
                value = options;
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
         * Adds an audio block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.audio.createBlock for full documentation
         */
        audio(options) {
            return this.addBlock("audio", options);
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
         * Adds a table block to the current stack, then increments the stack one level down, so further blocks are added as children of the table block. Only tableRow() and endTable() may be chained directly to this method.
         *
         * @returns {this} The builder instance for method chaining.
         * @see block.table.createBlock for full documentation
         */
        table(options) {
            return this.startParent("table", options);
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
         * Alias for endParent(). Provides an intuitive way to stop adding table_row blocks to the current table block, and goes one level up in the block stack.
         *
         * @returns {this} The builder instance for method chaining.
         */
        endTable() {
            return this.endParent();
        },

        /**
         * Adds a breadcrumb block to the current stack.
         * @returns {this} The builder instance for method chaining.
         * @see block.breadcrumb.createBlock for full documentation
         */
        breadcrumb() {
            return this.addBlock("breadcrumb");
        },

        /**
         * Adds a column list to the current stack, then increments the stack one level down, so further blocks are added as children of the column list block. Only column() may be chained directly to this method. Column lists must have at least two column children, each of which must have at least one non-column child block.
         * 
         * @returns {this} The builder instance for method chaining.
         * @see block.column_list.createBlock for full documentation.
         */
        columnList(options) {
            return this.startParent("column_list", options)
        },

        /**
         * Alias for endParent(). Provides an intuitive way to stop adding column blocks to the current column_list block, and goes one level up in the block stack.
         *
         * @returns {this} The builder instance for method chaining.
         */
        endColumnList() {
            return this.endParent()
        },

        /**
         * Adds a column block to the current stack, then increments the stack one level down, so further blocks are added as children of the column block. Only non-column blocks can be added as children of column blocks.
         * @returns {this} The builder instance for method chaining.
         * @see block.column.createBlock for full documentation.
         */
        column(options) {
            return this.startParent("column", options)
        },

        /**
         * Alias for endParent(). Provides an intuitive way to stop adding blocks to the current column block, and goes one level up in the block stack.
         *
         * @returns {this} The builder instance for method chaining.
         */
        endColumn() {
            return this.endParent()
        },

        /**
         * Adds a block to the stack for each element in the passed array.
         * @returns {this} The builder instance for method chaining.
         */
        loop(blockTypeOrCallback, arr) {
            if (arr === undefined || arr === null || arr.length < 1) {
                return this;
            }

            if (typeof blockTypeOrCallback === "function") {
                arr.forEach((element, index) => {
                    blockTypeOrCallback(this, element, index);
                });
            } else {
                arr.forEach((element) => {
                    this.addBlock(blockTypeOrCallback, element);
                });
            }
            return this;
        },

        /**
         * Builds and returns the final Notion object based on the current state of the builder.
         *
         * @returns {this} An object containing the built content and any additional blocks.
         * @property {Object|Array} content - The main content of the built object. This can be a full page object, a properties object, or an array of blocks, depending on what was added to the builder.
         * @property {Array} additionalBlocks - Any blocks that exceed Notion's maximum block limit per request. These will need to be added in subsequent requests.
         * @throws {Error} If no data was added to the builder.
         * @example
         * const notion = createNotionBuilder();
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
                removeNullProps(data.properties);
            }

            if (handleTemplatePageChildren && data.template && data.template.type && data.template.type !== "none") {
                if (data.children && data.children.length > 0) {
                    const chunkedBlocks = chunkBlocks(data.children);
                    result.additionalBlocks = chunkedBlocks;
                    delete data.children;
                }
            }

            if (hasPageParent) {
                
                if (!parentIsDataSource) {
                    
                    if (data.properties) {
                        
                        for (const key in data.properties) {
                            
                            if (
                                data.properties[key] &&
                                typeof data.properties[key] === "object" &&
                                "title" in data.properties[key] &&
                                key !== "title"
                            ) {
                                console.warn(`[NotionBuilder] Non-standard title property "${key}" found (expected "title" due to page having a parent type of Page rather than Data Source). Automatically renaming property "${key}" to "title".`);
                                
                                data.properties["title"] = data.properties[key];
                                delete data.properties[key];
                                break;
                            }
                        }
                    }
                }
                
                if (
                    limitChildren === true &&
                    data.children.length > CONSTANTS.MAX_BLOCKS
                ) {
                    const chunkedBlocks = chunkBlocks(data.children);
                    data.children = chunkedBlocks[0];
                    result.additionalBlocks = chunkedBlocks.slice(1);
                }
                const { parent, ...rest } = data;
                result.content = parent ? { parent, ...rest } : data;
            } else if (hasPageId) {
                if (
                    limitChildren === true &&
                    data.children.length > CONSTANTS.MAX_BLOCKS
                ) {
                    const chunkedBlocks = chunkBlocks(data.children);
                    data.children = chunkedBlocks[0];
                    result.additionalBlocks = chunkedBlocks.slice(1);
                }
                const { page_id, ...rest } = data;
                result.content = page_id ? { page_id, ...rest } : data;
            } else if (hasBlockId) {
                if (
                    limitChildren === true &&
                    data.children.length > CONSTANTS.MAX_BLOCKS
                ) {
                    const chunkedBlocks = chunkBlocks(data.children);
                    data.children = chunkedBlocks[0];
                    result.additionalBlocks = chunkedBlocks.slice(1);
                }
                const { block_id, ...rest } = data;
                result.content = block_id ? { block_id, ...rest } : data;
            } else if (hasProperty && !hasBlock) {
                result.content = data.properties;
            } else if (hasBlock && !hasProperty) {
                if (
                    limitChildren === true &&
                    data.children.length > CONSTANTS.MAX_BLOCKS
                ) {
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
                if (
                    limitChildren === true &&
                    data.children.length > CONSTANTS.MAX_BLOCKS
                ) {
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

            // Validate tables have children after building (check both content and additionalBlocks)
            if (hasBlock) {
                const blocksToValidate = [];
                if (result.content) {
                    if (Array.isArray(result.content)) {
                        blocksToValidate.push(...result.content);
                    } else if (result.content.children && Array.isArray(result.content.children)) {
                        blocksToValidate.push(...result.content.children);
                    }
                }
                if (result.additionalBlocks && Array.isArray(result.additionalBlocks)) {
                    result.additionalBlocks.forEach(chunk => {
                        if (Array.isArray(chunk)) {
                            blocksToValidate.push(...chunk);
                        }
                    });
                }
                
                const tableErrors = validateTables(blocksToValidate);
                if (tableErrors.length > 0) {
                    const error = `[NotionBuilder] ${tableErrors.join(" ")}`;
                    console.error(error);
                    throw new Error(error);
                }
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
         * const notion = createNotionBuilder();
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

/**
 * @deprecated Use createNotionBuilder() instead. This function is maintained for backwards compatibility.
 * @function createNotion
 * @param {Object} options - The options for creating a Notion builder.
 * @param {boolean} [options.strict=false] If true, the builder will throw errors when passed invalid or null data.
 * @param {number} [options.limitNesting=true] If true, limits the number of nested children block arrays to 2.
 * @param {boolean} [options.limitChildren=true] If true, the final content object's children array will have a maximum of 100 blocks.
 * @param {boolean} [options.allowBlankParagraphs=false] If true, calling .paragraph("") will result in an empty paragraph block.
 * @returns {NotionBuilder} A builder object with methods for constructing and managing Notion content.
 */
export function createNotion(options) {
    console.warn('createNotion() is deprecated. Please use createNotionBuilder() instead.');
    return createNotionBuilder(options);
}