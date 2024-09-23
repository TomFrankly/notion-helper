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
 * - Append block children (patch) !
 * - Retrieve a block (get) 
 * - Retrieve block children (get)
 * - Update a block (patch)
 * - Delete a block (delete)
 * 
 * page
 * - Create a page (post) !
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

export const request = {
    /**
     * Methods for page creation.
     * 
     * @namespace
     */
    pages: {

    }, 

    blocks: {

    }
}