import { getDepth, getTotalCount, getLongestArray, getPayloadSize } from "./utils.mjs"
import CONSTANTS from "./constants.mjs";

/**
 * These functions take user-provided callback functions for API-specific requests, such as page-creation.
 *
 * This will allow the library to handle requests directly, which will eventually enable deep tree-traversal and
 * the construction of very complex pages and blocks structures.
 *
 * Needed request types:
 *
 * Auth
 * - Create a token (post)
 *
 * blocks
 * X Append block children (patch)
 * - Retrieve a block (get)
 * - Retrieve block children (get)
 * - Update a block (patch)
 * - Delete a block (delete)
 *
 * More block tasks
 * - Handle nested columns (API can't handle a column_list block at the last nesting level)
 * X Improve performance of block-append algorithm. (In a good spot now, though could be better using an in-memory tracker tree)
 *
 * page
 * X Create a page (post)
 * - Retrieve a page (get)
 * - Retrieve a page property (get)
 * - Update page properties (patch)
 *
 * database
 * - Create a database (post)
 * - Query a database (post)
 * -- Build a filter
 * -- Build a sort
 * - Retrieve a database (get)
 * - Update a database (patch)
 * -- Update database properties
 *
 * users
 * - List all users (get)
 * - Retrieve a user (get)
 * - Retrieve your token's bot user (get)
 *
 * comments
 * - Create comment (post)
 * - Retrieve comments (get)
 *
 * search
 * - Search by title (post)
 */

/**
 * Object with methods for making requests to the Notion API.
 *
 * Each method requires that you passe either a Client object created with the Notion SDK (https://github.com/makenotion/notion-sdk-js) or a custom apiCall function.
 *
 * @namespace
 */
export const request = {
    /**
     * Methods for page creation.
     *
     * @namespace
     */
    pages: {
        /**
         * Creates a new page in Notion and optionally appends child blocks to it. Includes as many child blocks as possible in the initial request. Uses request.blocks.children.append() for all remaining child blocks, so it can handle nested blocks to any level.
         *
         * @function
         * @param {Object} options - The options for creating a page.
         * @param {Object} options.data - The data for creating the page.
         * @param {Object} options.data.parent - The parent of the page (must include data_source_id, page_id, or database_id (database_id is deprecated and will not work in databases with more than one data source)).
         * @param {Object} [options.data.properties] - The properties of the page.
         * @param {Object} [options.data.icon] - The icon of the page.
         * @param {Object} [options.data.cover] - The cover of the page.
         * @param {Array<Object>} [options.data.children] - An array of child blocks to add to the page.
         * @param {Object} [options.client] - The Notion client object. Either this or apiCall must be provided.
         * @param {Function} [options.apiCall] - A custom function for making API calls. Either this or client must be provided.
         * @param {Function} [options.getPage=(response) => response] - A function to extract the page data from the API response. If you're passing a custom apiCall function, you should pass a getPage function as well.
         * @param {Function} [options.getResults=(response) => response.results] - A function to extract results from the API response when appending blocks. Enables the append() method to append all child blocks in the request. If you're passing a custom apiCall function, you should pass a getResults function as well.
         * @returns {Promise<Object>} An object containing the API response for page creation and, if applicable, the result of appending children.
         * @throws {Error} If no parent is provided or if there's an error during page creation or block appending.
         * @example
         * // Using with Notion SDK client
         * const notion = new Client({ auth: NOTION_TOKEN });
         * const page = createNotion()
         *      .parentDataSource("your-data-source-id")
         *      .title("Name", "Charmander")
         *      .icon("https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png")
         *      .richText("Category", "Lizard Pokémon")
         *      .quote("Obviously prefers hot places. When it rains, steam is said to spout from the tip of its tail.")
         *      .build()
         *
         * const result = await request.pages.create({
         *   data: page.content,
         *   client: notion
         * });
         *
         * // Using with custom API call function (using ky)
         * import ky from 'ky';
         *
         * const NOTION_TOKEN = 'your-notion-token';
         * const NOTION_VERSION = '2025-09-03';
         *
         * const customApiCall = async (data) => {
         *   return await ky.post('https://api.notion.com/v1/pages', {
         *     json: data,
         *     headers: {
         *       'Authorization': `Bearer ${NOTION_TOKEN}`,
         *       'Notion-Version': NOTION_VERSION,
         *     },
         *   }).json();
         * };
         *
         * const page = createNotion()
         *      .parentDataSource("your-data-source-id")
         *      .title("Name", "Squirtle")
         *      .icon("https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png")
         *      .richText("Category", "Tiny Turtle Pokémon")
         *      .quote("After birth, its back swells and hardens into a shell. Powerfully sprays foam from its mouth.")
         *      .build()
         *
         * const result = await request.pages.create({
         *   data: page.content,
         *   apiCall: customApiCall,
         *   getPage: (response) => response,
         *   getResults: (response) => response.results
         * });
         */
        create: async ({
            data,
            client,
            apiCall,
            getPage = (response) => response,
            getResults = (response) => response.results,
        }) => {
            if (!data.parent) {
                const error = `No parent page or database provided. Page cannot be created.`;
                console.error(error);
                throw new Error(error);
            }

            let pageChildren = [];

            if (data.children) {
                pageChildren = [...data.children];
                data.children = [];

                const hasNestedChildren = (block) => {
                    if (!block[block.type]?.children?.length) return false;
                    
                    return block[block.type].children.some(child => 
                        child[child.type]?.children?.length > 0
                    );
                };

                const countBlocksIncludingChildren = (block) => {
                    let count = 1;
                    if (block[block.type]?.children?.length) {
                        count += block[block.type].children.length;
                    }
                    return count;
                };

                const hasExcessiveChildrenArray = (block) => {
                    if (!block[block.type]?.children?.length) return false;
                    return block[block.type].children.length > CONSTANTS.MAX_BLOCKS;
                };

                const baseDataSize = new TextEncoder().encode(JSON.stringify(data)).length;
                const MAX_PAYLOAD_SIZE = CONSTANTS.MAX_PAYLOAD_SIZE;
                let currentPayloadSize = baseDataSize;
                let totalBlockCount = 0;

                let i = 0;
                for (; i < pageChildren.length; i++) {
                    const block = pageChildren[i];
                    const blockSize = new TextEncoder().encode(JSON.stringify(block)).length;
                    
                    const wouldExceedPayload = currentPayloadSize + blockSize > MAX_PAYLOAD_SIZE;
                    const wouldExceedBlockLimit = data.children.length >= CONSTANTS.MAX_BLOCKS;
                    const wouldExceedTotalBlocks = totalBlockCount + countBlocksIncludingChildren(block) > CONSTANTS.MAX_BLOCKS_REQUEST;
                    const blockHasNestedChildren = hasNestedChildren(block);
                    const blockHasExcessiveChildren = hasExcessiveChildrenArray(block);
                    
                    if (wouldExceedPayload || wouldExceedBlockLimit || wouldExceedTotalBlocks || blockHasNestedChildren || blockHasExcessiveChildren) {
                        break;
                    }

                    data.children.push(block);
                    currentPayloadSize += blockSize;
                    totalBlockCount += countBlocksIncludingChildren(block);
                }

                pageChildren = pageChildren.slice(i);

            }

            let callingFunction;
            if (client && typeof client.pages.create === "function") {
                callingFunction = async (data) => {
                    try {
                        return await client.pages.create(data);
                    } catch (error) {
                        console.error(
                            `Error encountered when calling Notion API to create page: ${error}`
                        );
                        throw error;
                    }
                };
            } else if (typeof apiCall === "function") {
                callingFunction = async (...args) => {
                    try {
                        return await apiCall(...args);
                    } catch (error) {
                        console.error(
                            `Error encountered when calling Notion API to create page: ${error}`
                        );
                        throw error;
                    }
                };
            }

            try {
                const response = await callingFunction(data);

                let createdPage;

                if (response) {
                    createdPage = getPage(response);
                }

                if (createdPage && pageChildren && pageChildren.length > 0) {
                    try {
                        const appendedBlocks =
                            await request.blocks.children.append({
                                block_id: createdPage.id,
                                children: pageChildren,
                                client,
                                apiCall,
                                getResults,
                            });

                        return {
                            apiResponse: response,
                            appendedBlocks: appendedBlocks,
                        };
                    } catch (error) {
                        console.error(
                            `Encountered error when trying to append children blocks to page ${createdPage.id}: ${error}`
                        );
                        throw error;
                    }
                }

                return {
                    apiResponse: response,
                };
            } catch (error) {
                console.error(
                    `Encountered error when trying to create page: ${error}`
                );
                throw error;
            }
        },
    },

    /**
     * Methods for working with blocks.
     *
     * @namespace
     */
    blocks: {
        /**
         * Methods for working with block children.
         *
         * @namespace
         */
        children: {
            /**
             * Appends a children block array to a parent block (or page). Handles nested blocks to any level via recursion.
             *
             * @function
             * @param {Object} options - The options for appending blocks.
             * @param {string} options.block_id - The ID of the parent block to append children to. Can be a page ID.
             * @param {string} options.after - The ID of an existing block after which to append the children.
             * @param {Array<Object>} options.children - An array of child blocks to append.
             * @param {Object} [options.client] - The Notion client object. Either this or apiCall must be provided.
             * @param {Function} [options.apiCall] - A custom function for making API calls. Either this or client must be provided.
             * @param {Function} [options.getResults] - A function to extract results from the API response. Defaults to response => response.results, which will work if you pass a client object created with the Notion SDK: https://github.com/makenotion/notion-sdk-js. If you're passing a custom apiCall function, you should provide a matching getResults function that can handle the response and return the results array, which contains the created blocks.
             * @returns {Promise<Object>} An object containing the API responses and the total number of API calls made.
             * @example
             * // Using with Notion SDK client
             * const notion = new Client({ auth: NOTION_TOKEN });
             * const childBlocks = createNotion().paragraph("A paragraph").build()
             *
             * const { apiResponses, apiCallCount } = await request.blocks.children.append({
             *   block_id: 'your-block-id',
             *   children: childBlocks.content,
             *   client: notion
             * });
             *
             * // Using with custom API call function (using ky)
             * import ky from 'ky';
             *
             * const NOTION_TOKEN = 'your-notion-token';
             *
             * const customApiCall = async (block_id, children) => {
             *   const response = await ky.patch(
             *     `https://api.notion.com/v1/blocks/${block_id}/children`,
             *     {
             *       json: { children },
             *       headers: {
             *         'Authorization': `Bearer ${NOTION_TOKEN}`,
             *         'Notion-Version': '2025-09-03',
             *       },
             *     }
             *   ).json();
             *   return response;
             * };
             *
             * const childBlocks = createNotion().paragraph("Hello, World!").build();
             *
             * const { apiResponses, apiCallCount } = await request.blocks.children.append({
             *   block_id: 'your-block-id',
             *   children: childBlocks.content,
             *   apiCall: customApiCall
             * });
             */
            append: (() => {
                let apiCallCount = 0;
                const specialTypes = ["column_list"]

                function createSlices(arr) {
                    const MAX_PAYLOAD_SIZE = CONSTANTS.MAX_PAYLOAD_SIZE;
                    let chunks = []
                    let tempArr = []
                    let count = 0
                    let currentPayloadSize = 0

                    for (let block of arr) {
                        const blockPayload = JSON.stringify(block)
                        const blockSize = new TextEncoder().encode(blockPayload).length

                        if (blockSize > MAX_PAYLOAD_SIZE) {
                            
                            if (tempArr.length > 0) {
                                chunks.push(tempArr)
                                tempArr = []
                                count = 0
                                currentPayloadSize = 0
                            }

                            chunks.push([block])
                            continue
                        }

                        const wouldExceedPayload = currentPayloadSize + blockSize > MAX_PAYLOAD_SIZE
                        const wouldExceedCount = count > 99

                        const hasTypeMismatch = tempArr.length > 0 && block && (
                            (specialTypes.includes(block.type) && !specialTypes.includes(tempArr[0].type)) ||
                            (!specialTypes.includes(block.type) && specialTypes.includes(tempArr[0].type))
                        )

                        if (wouldExceedPayload || wouldExceedCount || hasTypeMismatch) {
                            chunks.push(tempArr)
                            tempArr = []
                            tempArr.push(block)
                            count = 1
                            currentPayloadSize = blockSize
                        } else {
                            tempArr.push(block)
                            count++
                            currentPayloadSize += blockSize
                        }
                    }

                    if (tempArr.length > 0) {
                        chunks.push(tempArr)
                    }

                    return chunks
                }
                
                async function appendInternal({
                    block_id,
                    children,
                    after = null,
                    client,
                    apiCall,
                    getResults = (response) => response.results,
                }) {
                    if (!children || children.length < 1) {
                        console.warn(
                            `No children provided to append function.`
                        );
                        return null;
                    }

                    let allResponses = [];

                    try {
                        
                        const chunks = createSlices(children)
                        
                        for (let chunk of chunks) {

                            const chunkChildren = []

                            const blockLimit = CONSTANTS.MAX_BLOCKS_REQUEST
                            const blocksInChunk = getTotalCount(chunk)

                            const maxChildArrayLimit = CONSTANTS.MAX_BLOCKS
                            const maxChildArrayLength = getLongestArray(chunk)

                            const maxDepthLimit = CONSTANTS.MAX_CHILD_ARRAY_DEPTH
                            const maxDepth = getDepth(chunk)
                            
                            /* Currently, a column_list block is a "special type" and cannot have its children recursively applied
                            in future calls. */
                            if (
                                !specialTypes.includes(chunk[0].type) && 
                                (blocksInChunk > blockLimit || maxDepth > maxDepthLimit || maxChildArrayLength > maxChildArrayLimit)
                            ) {
                                let blocksUsed = chunk.length
                                
                                for (let block of chunk) {
                                    const type = block.type;
    
                                    if (
                                        block[type] &&
                                        block[type].children &&
                                        block[type].children.length > 0
                                    ) {
                                        const blockMaxDepth = getDepth(block[type].children, 1)
                                        const blockMaxChildArrayLength = getLongestArray(block[type].children)
                                        const blockTotalChildBlockCount = getTotalCount(block[type].children)
                                        const blockPayloadSize = getPayloadSize(block[type].children)

                                        if (
                                            blockMaxDepth <= maxDepthLimit &&
                                            blockMaxChildArrayLength <= maxChildArrayLimit &&
                                            blocksUsed + blockTotalChildBlockCount < blockLimit - 100 // Leave buffer for required children of table blocks
                                        ) {
                                            blocksUsed += blockTotalChildBlockCount
                                            const blankArray = [];
                                            chunkChildren.push(blankArray);
                                        } else {
                                            const childrenArray = block[type].children;

                                            if (type === "table") {
                                                const firstRowsCount = Math.max(1, Math.min(blockLimit - 100 - blocksUsed, block[type].children.length, maxChildArrayLimit))
                                                blocksUsed += firstRowsCount
                                                const firstRows = childrenArray.slice(0, firstRowsCount)
                                                const remainingRows = childrenArray.slice(firstRowsCount)

                                                chunkChildren.push(remainingRows)
                                                block[type].children = []
                                                block[type].children.push(...firstRows)
                                            } else {
                                                chunkChildren.push(childrenArray);
                                                block[type].children = [];
                                            }
                                        }
                                    } else {
                                        const blankArray = [];
                                        chunkChildren.push(blankArray);
                                    }
                                }
                            } else {
                                chunkChildren.push(...chunk.map(() => []));
                            }

                            let callingFunction;

                            if (
                                client &&
                                typeof client.blocks.children.append ===
                                    "function"
                            ) {
                                callingFunction = async function (
                                    block_id,
                                    children,
                                    after
                                ) {
                                    apiCallCount++;
                                    try {
                                        return await client.blocks.children.append(
                                            {
                                                block_id: block_id,
                                                children: children,
                                                ...(after && after !== null && { after })
                                            }
                                        );
                                    } catch (error) {
                                        console.error(
                                            `Error encountered when calling Notion API to append block: ${error}`
                                        );
                                        throw error;
                                    }
                                };
                            } else if (typeof apiCall === "function") {
                                callingFunction = async function (...args) {
                                    apiCallCount++;
                                    try {
                                        return await apiCall(...args);
                                    } catch (error) {
                                        console.error(
                                            `Error encountered when calling Notion API to append block: ${error}`
                                        );
                                        throw error;
                                    }
                                };
                            } else {
                                const error = `No Notion SDK client object or custom API call function provided to append function.`;
                                console.error(error);
                                throw new Error(error);
                            }

                            const response = await callingFunction(
                                block_id,
                                chunk
                            );
                            if (response) {
                                allResponses.push(response);
                                const results = getResults(response);

                                for (let [index, block] of chunk.entries()) {

                                    if (chunkChildren[index].length > 0) {
                                        if (
                                            results[index] &&
                                            block.type === results[index].type
                                        ) {
                                            const nestedResponses =
                                                await appendInternal({
                                                    block_id: results[index].id,
                                                    children:
                                                        chunkChildren[index],
                                                    client,
                                                    apiCall,
                                                    getResults,
                                                });

                                            if (nestedResponses) {
                                                allResponses =
                                                    allResponses.concat(
                                                        nestedResponses
                                                    );
                                            }
                                        }
                                    }
                                }
                            } else {
                                console.warn(
                                    `Failed to append chunk to block ${block_id}`
                                );
                            }
                        }

                        return allResponses;
                    } catch (error) {
                        console.error(
                            `Error occurred in appendInternal: ${error}`
                        );
                        throw error;
                    }
                }

                const append = async (options) => {
                    apiCallCount = 0;
                    try {
                        const responses = await appendInternal(options);
                        return {
                            apiResponses: responses,
                            apiCallCount: apiCallCount,
                        };
                    } catch (error) {
                        console.error(
                            `Encountered error while appending block children: ${error}`
                        );
                        return {
                            apiResponses: null,
                            apiCallCount: apiCallCount,
                            error: error.message,
                        };
                    }
                };

                append.resetApiCallCount = () => {
                    apiCallCount = 0;
                };

                return append;
            })(),
        },
    },
};

/*
 * Quality-of-life functions for requests:
 */

/**
 * Request shorthand methods - these allow you to call the methods of the request object directly. Import them directly into a file, or call them on NotionHelper.
 * @namespace RequestShorthand
 */

/**
 * Creates a new page in Notion and optionally appends child blocks to it.
 * @memberof RequestShorthand
 * @function
 * @param {Object} options - The options for creating a page.
 * @param {Object} options.data - The data for creating the page.
 * @param {Object} options.data.parent - The parent of the page (must include data_source_id, page_id, or database_id (database_id is deprecated and will not work in databases with more than one data source)).
 * @param {Object} [options.data.properties] - The properties of the page.
 * @param {Object} [options.data.icon] - The icon of the page.
 * @param {Object} [options.data.cover] - The cover of the page.
 * @param {Array<Object>} [options.data.children] - An array of child blocks to add to the page.
 * @param {Object} [options.client] - The Notion client object. Either this or apiCall must be provided.
 * @param {Function} [options.apiCall] - A custom function for making API calls. Either this or client must be provided.
 * @param {Function} [options.getPage] - A function to extract the page data from the API response. Defaults to (response) => response.
 * @param {Function} [options.getResults] - A function to extract results from the API response when appending blocks. Defaults to (response) => response.results.
 * @returns {Promise<Object>} An object containing the API response for page creation and, if applicable, the result of appending children.
 * @throws {Error} If no parent is provided or if there's an error during page creation or block appending.
 * @example
 * // Using with Notion SDK client
 * const notion = new Client({ auth: NOTION_TOKEN });
 * const page = createNotion()
 *      .parentDataSource("your-data-source-id")
 *      .title("Name", "Charmander")
 *      .icon("https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png")
 *      .richText("Category", "Lizard Pokémon")
 *      .quote("Obviously prefers hot places. When it rains, steam is said to spout from the tip of its tail.")
 *      .build()
 *
 * const result = await createPage({
 *   data: page.content,
 *   client: notion
 * });
 *
 * // Using with custom API call function
 * const customApiCall = async (data) => {
 *   // Your custom API call implementation
 * };
 *
 * const result = await createPage({
 *   data: page.content,
 *   apiCall: customApiCall,
 *   getPage: (response) => response,
 *   getResults: (response) => response.results
 * });
 */
export function createPage(options) {
    return request.pages.create(options);
}

/**
 * Appends a children block array to a parent block (or page). Handles nested blocks to any level via recursion.
 * @memberof RequestShorthand
 * @function
 * @param {Object} options - The options for appending blocks.
 * @param {string} options.block_id - The ID of the parent block to append children to. Can be a page ID.
 * @param {Array<Object>} options.children - An array of child blocks to append.
 * @param {Object} [options.client] - The Notion client object. Either this or apiCall must be provided.
 * @param {Function} [options.apiCall] - A custom function for making API calls. Either this or client must be provided.
 * @param {Function} [options.getResults] - A function to extract results from the API response. Defaults to response => response.results, which will work if you pass a client object created with the Notion SDK: https://github.com/makenotion/notion-sdk-js. If you're passing a custom apiCall function, you should provide a matching getResults function that can handle the response and return the results array, which contains the created blocks.
 * @returns {Promise<Object>} An object containing the API responses and the total number of API calls made.
 * @throws {Error} If there's an error during the API call or block appending process.
 * @example
 * // Using with Notion SDK client
 * const notion = new Client({ auth: NOTION_TOKEN });
 * const childBlocks = createNotion().paragraph("A paragraph").build()
 *
 * const { apiResponses, apiCallCount } = await appendBlocks({
 *   block_id: 'your-block-id',
 *   children: childBlocks.content,
 *   client: notion
 * });
 *
 * // Using with custom API call function (using ky)
 * import ky from 'ky';
 *
 * const NOTION_TOKEN = 'your-notion-token';
 *
 * const customApiCall = async (block_id, children) => {
 *   const response = await ky.patch(
 *     `https://api.notion.com/v1/blocks/${block_id}/children`,
 *     {
 *       json: { children },
 *       headers: {
 *         'Authorization': `Bearer ${NOTION_TOKEN}`,
 *         'Notion-Version': '2025-09-03',
 *       },
 *     }
 *   ).json();
 *   return response;
 * };
 *
 * const childBlocks = createNotion().paragraph("Hello, World!").build();
 *
 * const { apiResponses, apiCallCount } = await appendBlocks({
 *   block_id: 'your-block-id',
 *   children: childBlocks.content,
 *   apiCall: customApiCall
 * });
 */
export function appendBlocks(options) {
    return request.blocks.children.append(options);
}
