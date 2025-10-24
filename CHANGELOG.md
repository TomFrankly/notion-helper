# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Template Support for Page Creation
- **New `template()` method in page builder**: Added support for setting data source templates when creating pages
  - Accepts multiple input formats:
    - String shortcuts: `"none"`, `"default"`, or a valid template page ID (UUID)
    - Fully-formed template objects with `type` and `template_id` properties
  - Includes comprehensive validation and error handling
  - Supports method chaining for fluent API usage

```javascript
// Usage examples:
builder.template("default")           // Use default template
builder.template("none")              // No template
builder.template("uuid-string")       // Use specific template by ID
builder.template({                    // Use fully-formed template object
  type: "template_id",
  template_id: "your-template-id"
})
```

#### Template Page Creation Handling
- **Enhanced `request.pages.create()` method**: Added comprehensive template support for page creation
  - **Automatic children handling**: When templates are used, all children blocks are automatically moved out of the initial page creation request (required by Notion API)
  - **Template processing wait**: Configurable wait time (`templateWaitMs`, default: 3000ms) to allow Notion's template processing to complete
  - **Callback support**: Optional `onTemplatePageCreated` callback for custom template verification logic
  - **Manual control option**: `skipAutoAppendOnTemplate` flag to return children for manual appending instead of auto-appending

```javascript
// Basic template usage with automatic handling
const result = await request.pages.create({
  data: templatePage.content,
  client: notion,
  templateWaitMs: 2000 // Wait 2 seconds for template processing
});

// Advanced template usage with callback
const result = await request.pages.create({
  data: templatePage.content,
  client: notion,
  onTemplatePageCreated: async ({ page }) => {
    console.log(`Template page created: ${page.id}`);
    // page.parent contains data_source_id or database_id if needed
    // Custom verification logic here
  }
});

// Manual control over template verification
const result = await request.pages.create({
  data: templatePage.content,
  client: notion,
  skipAutoAppendOnTemplate: true
});

// Manually append children after verification
if (result.pendingChildren && result.pendingChildren.length > 0) {
  await request.blocks.children.append({
    block_id: result.pageId,
    children: result.pendingChildren,
    client: notion
  });
}
```

#### Template Builder Configuration
- **New `handleTemplatePageChildren` option**: Added to `createNotionBuilder()` for automatic template children handling
  - When enabled, automatically moves all children to `additionalBlocks` when templates are applied
  - Ensures compliance with Notion API requirements for template page creation
  - Provides seamless integration with existing `additionalBlocks` workflow
  - Enables two-level control: builder-level (manual) vs request-level (automatic)

```javascript
// Enable automatic template children handling
const builder = createNotionBuilder({ 
  handleTemplatePageChildren: true 
});

const result = builder
  .parentDataSource('data-source-id')
  .template('default')
  .title('Name', 'Task from Template')
  .paragraph('This will be moved to additionalBlocks')
  .build();

// Create page, then append additional blocks
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const newPage = await notion.pages.create(result.content);

if (result.additionalBlocks && result.additionalBlocks.length > 0) {
  for (const blockChunk of result.additionalBlocks) {
    await notion.blocks.children.append({
      block_id: newPage.id,
      children: blockChunk
    });
  }
}
```

#### Template Documentation and Developer Guide
- **New comprehensive Template Usage Guide**: Added detailed developer guide covering template implementation
  - **Two-level control system**: Explains builder-level vs request-level template handling
  - **Production best practices**: Webhook integration, template verification, error handling
  - **Migration guidance**: Step-by-step examples for migrating from non-template pages
  - **Troubleshooting section**: Common issues and solutions for both control levels
  - **Code examples**: Practical, copy-paste examples for all template scenarios

#### Template Callback API Improvements
- **Simplified callback signature**: Updated `onTemplatePageCreated` callback to receive `{ page }` instead of `{ page, pageId }`
  - Removes redundant `pageId` parameter since it's available as `page.id`
  - Provides access to full page object including `page.parent` for template verification
  - Maintains future extensibility with object-based parameter structure
  - Updated all documentation and examples to reflect new signature

```javascript
// Updated callback signature
onTemplatePageCreated: async ({ page }) => {
  console.log(`Template page created: ${page.id}`);
  // page.parent contains data_source_id or database_id if needed
  // Custom verification logic here
}
```

#### Enhanced Type Validation
- **Improved `createMeta` functions**: Added explicit type validation parameters to metadata creation functions
  - `page_id.createMeta()` now validates against "UUID" type
  - `block_id.createMeta()` now validates against "UUID" type  
  - `property_id.createMeta()` now validates against "string" type

```javascript
// Before:
createMeta: (page_id) => validateValue(page_id)

// After:
createMeta: (page_id) => validateValue(page_id, "UUID")
```

#### URL Processing Utility
- **New `extractNotionPageId()` function**: Utility for extracting Notion page IDs from URLs
  - Handles both dashed (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`) and non-dashed (`xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`) UUID formats
  - Extracts IDs from URLs containing query parameters
  - Returns null for invalid inputs or when no valid ID is found

```javascript
// Function signature:
export function extractNotionPageId(url)

// Usage examples:
extractNotionPageId("https://notion.so/page/12345678-1234-1234-1234-123456789abc")
// Returns: "12345678123412341234123456789abc"

extractNotionPageId("https://notion.so/page/12345678123412341234123456789abc?v=123")
// Returns: "12345678123412341234123456789abc"
```

### Changed

#### Import Dependencies
- **Updated `pages.mjs` imports**: Added `isValidUUID` import from utils module to support template validation functionality

### Technical Details

#### Template Metadata Definition
The new `template` metadata definition includes:
- **Type**: `"string"` (for documentation purposes)
- **createMeta function**: Comprehensive validation logic that:
  - Handles undefined/null inputs gracefully
  - Validates string inputs against known shortcuts and UUID format
  - Validates object inputs for required properties and correct structure
  - Provides detailed console warnings for invalid inputs
  - Returns appropriate template objects or null for invalid inputs

#### Template Method Implementation
The `template()` method in the page builder:
- **Input validation**: Checks for valid string or object inputs
- **Error handling**: Provides console warnings for malformed calls
- **Method chaining**: Returns `this` for fluent API usage
- **Data storage**: Stores validated template metadata in the builder's data object

#### UUID Extraction Logic
The `extractNotionPageId()` function:
- **Regex pattern**: Matches both 32-character and dashed UUID formats
- **URL parsing**: Splits on query parameters to isolate the base URL
- **Format normalization**: Converts dashed UUIDs to non-dashed format
- **Case insensitive**: Handles both uppercase and lowercase hex characters
- **Boundary checking**: Ensures matched UUIDs are not part of longer hex strings

### Best Practices for Template Usage

#### Production Template Handling
For production applications using templates, consider these best practices:

1. **Choose Your Control Level**: 
   - **Request-level control** (`handleTemplatePageChildren: false`): Use for simple cases, quick prototyping, and standard workflows
   - **Builder-level control** (`handleTemplatePageChildren: true`): Use for complex verification, batch operations, webhook integration, and custom retry logic

2. **Webhook Integration**: Register webhook handlers for your integration to listen for `page.created` and `page.content_updated` events. This provides the most reliable way to detect when template processing is complete.

3. **Template Content Verification**: For critical applications, consider fetching the template content beforehand and comparing it against the returned page object to verify template processing completion.

4. **Callback Usage**: Use the `onTemplatePageCreated` callback for custom verification logic, such as:
   - Checking specific properties or content
   - Implementing retry logic
   - Logging template processing status

5. **Manual Control**: For applications requiring precise control, use `skipAutoAppendOnTemplate: true` (request-level) or `handleTemplatePageChildren: true` (builder-level) and implement your own template verification before appending children.

6. **Wait Time Configuration**: Adjust `templateWaitMs` based on your template complexity and Notion API response times. Start with the default 3000ms and adjust based on your specific use case.

```javascript
// Example: Production-ready template handling (Request-level)
const result = await request.pages.create({
  data: templatePage.content,
  client: notion,
  templateWaitMs: 5000, // Longer wait for complex templates
  onTemplatePageCreated: async ({ page }) => {
    // Custom verification logic
    const pageContent = await notion.blocks.children.list({
      block_id: page.id
    });
    
    if (pageContent.results.length > 0) {
      console.log('Template processing appears complete');
    } else {
      console.log('Template still processing...');
    }
  }
});

// Example: Production-ready template handling (Builder-level)
const builder = createNotionBuilder({ 
  handleTemplatePageChildren: true 
});

const templatePage = builder
  .parentDataSource('data-source-id')
  .template('default')
  .title('Name', 'Task from Template')
  .paragraph('This will be moved to additionalBlocks')
  .build();

// Create page first, then handle template verification and block appending
const newPage = await notion.pages.create(templatePage.content);
await verifyTemplateProcessing(newPage.id); // Your custom verification

if (templatePage.additionalBlocks && templatePage.additionalBlocks.length > 0) {
  for (const blockChunk of templatePage.additionalBlocks) {
    await notion.blocks.children.append({
      block_id: newPage.id,
      children: blockChunk
    });
  }
}
```

### Breaking Changes
None in this release.

### Migration Guide
No migration required. All changes are additive and backward compatible.

---

## [1.3.27] - 2025-10-15

### Added

#### Block Validation and Splitting
- **New `validateAndSplitBlock()` utility function**: Intelligently handles blocks containing rich text objects that exceed Notion API character limits
  - Automatically splits oversized blocks into multiple API-compliant blocks
  - Preserves rich text formatting and structure during splitting
  - Enables reliable integration with other libraries like Martian
- **Enhanced `addExistingBlock()` method**: Updated to use `validateAndSplitBlock()` by default for automatic size compliance

```javascript
// Function signature:
export function validateAndSplitBlock(block, limit)

// Usage: Automatically called by addExistingBlock() method
builder.addExistingBlock(largeBlock) // Now automatically handles size limits
```

### Technical Details

#### Block Splitting Logic
- **Character limit detection**: Identifies when rich text content exceeds API limits
- **Intelligent splitting**: Breaks content at natural boundaries while preserving formatting
- **Multiple block creation**: Returns array of compliant blocks when splitting is needed
- **Format preservation**: Maintains rich text annotations, links, and other formatting

---

## [1.3.26] - 2025-10-14

### Added

#### Enhanced Property Validation
- **Length validation for multiple property types**:
  - Equations: Character limit enforcement
  - URLs: Length and format validation
  - Emails: Length and format validation  
  - Phone numbers: Length validation
  - Multi-selects: Item count and individual item length limits
  - Relations: Reference count limits
  - People: User count limits

#### Rich Text Mention Support
- **New helper functions for rich text mentions**:
  - User mentions with proper formatting
  - Page mentions with validation
  - Database mentions with reference handling

### Technical Details

#### Validation Enhancements
- **Property-specific limits**: Each property type now has appropriate character/item count limits
- **Error handling**: Comprehensive validation with clear error messages
- **API compliance**: Ensures all properties meet Notion API requirements

---

## [1.3.25] - 2025-09-24

### Fixed

#### Rich Text Equations Bug Fix
- **Fixed equation rendering**: Resolved issues with rich text equation blocks not displaying correctly
- **Improved equation validation**: Enhanced validation for mathematical expressions

### Changed

#### Dependency Management
- **Removed peer dependency**: Eliminated peer dependency requirement for Notion SDK
- **Simplified installation**: Users no longer need to manually install @notionhq/client

### Technical Details

#### Equation Handling
- **Enhanced equation parsing**: Improved handling of mathematical notation
- **Better error messages**: More descriptive errors for invalid equation syntax
- **Format validation**: Ensures equations meet Notion's formatting requirements

---

## [1.3.24] - 2025-09-08

### Added

#### Data Source Support
- **New parent data source functions**:
  - `parentDataSource()`: Full method for setting data source parents
  - `parentDs()`: Shorthand alias for data source parents
  - `parentDatabase()`: Specific method for database parents
- **Data source ID support**: Full compatibility with Notion's new `data_source_id` keys

### Changed

#### API Compatibility
- **Updated for new Notion API version**: Full compatibility with latest Notion API changes
- **Enhanced parent object handling**: Improved support for various parent object types
- **Updated documentation**: README reflects all new functionality

### Technical Details

#### Parent Object Functions
```javascript
// New parent data source methods:
builder.parentDataSource("data-source-id")
builder.parentDs("data-source-id")        // Shorthand
builder.parentDatabase("database-id")     // Database-specific
```

#### API Version Compatibility
- **Data source ID keys**: Support for `data_source_id` in parent objects
- **Backward compatibility**: Maintains support for existing parent object formats
- **Enhanced validation**: Improved validation for parent object types

---

## [1.3.23] - 2025-09-08

### Changed

#### Documentation and Build System Updates
- **Removed documentation dependency**: Eliminated `documentation` package dependency from devDependencies
- **Simplified build process**: Streamlined build scripts by removing documentation generation steps
- **Updated prepublishOnly script**: Removed documentation build from prepublish process

### Technical Details

#### Build System Improvements
- **Cleaner dependencies**: Reduced package dependencies by removing unused documentation tools
- **Faster builds**: Simplified build process for better performance
- **Streamlined publishing**: More efficient prepublish process without documentation generation

#### Script Changes
```json
// Removed scripts:
"docs": "...",
"docs:build": "...", 
"docs:serve": "...",

// Updated prepublishOnly:
"prepublishOnly": "npm run clean && npm run build"
```

---

## [1.3.22] - 2025-06-03

### Fixed

#### Payload Size Check Bug Fix
- **Fixed max payload size check**: Resolved issue with payload size validation that was causing incorrect behavior
- **Improved request handling**: Enhanced reliability of payload size calculations

### Technical Details

#### Payload Validation
- **Accurate size calculation**: Fixed algorithm for determining when payloads exceed API limits
- **Better error handling**: Improved validation logic for large requests

---

## [1.3.21] - 2025-05-20

### Added

#### Comprehensive File Upload Support
- **File uploads in all compatible blocks**: Added support for file attachments across all block types that support them
- **Page cover and icon uploads**: Enhanced support for uploading custom page covers and icons
- **File property support**: Added file upload capabilities for file properties in databases
- **Enhanced file handling utilities**: New utility functions for file processing and validation

### Technical Details

#### File Upload Implementation
- **Multi-format support**: Handles various file types and formats
- **Size validation**: Ensures uploaded files meet Notion API requirements
- **Error handling**: Comprehensive error handling for upload failures
- **Progress tracking**: Support for monitoring upload progress

#### Block Type Enhancements
- **Media block support**: Enhanced support for image, video, and file blocks
- **Cover image handling**: Improved page cover image upload and management
- **Icon management**: Better support for custom page icons

---

## [1.3.20] - 2025-05-20

### Added

#### API Function Renaming and Improvements
- **Renamed `createNotion()` to `createNotionBuilder()`**: Updated main function name for better clarity
- **Deprecated function alias**: Maintained backward compatibility with deprecated `createNotion()` function
- **Enhanced `buildRichTextObj()` structure**: Improved argument structure for better usability

### Changed

#### Function Signatures
```javascript
// New primary function:
createNotionBuilder(options)

// Deprecated but still supported:
createNotion(options) // Alias for createNotionBuilder()
```

### Technical Details

#### Rich Text Object Improvements
- **Better argument handling**: Enhanced parameter structure for rich text objects
- **Improved validation**: Better validation of rich text parameters
- **Backward compatibility**: Maintained support for existing function calls

---

## [1.3.19] - 2025-05-18

### Added

#### Fluent Interface Enhancement
- **New `addExistingBlock()` method**: Added method to fluent interface for adding pre-existing blocks
- **Enhanced block management**: Improved support for working with existing block structures
- **Better block composition**: Enhanced ability to compose pages from existing blocks

### Technical Details

#### Block Addition Method
```javascript
// New method signature:
builder.addExistingBlock(block)

// Usage:
builder.addExistingBlock(existingBlock)
```

#### Implementation Details
- **Block validation**: Validates existing blocks before addition
- **Structure preservation**: Maintains block structure and formatting
- **Error handling**: Comprehensive error handling for invalid blocks

---

## [1.3.18] - 2025-05-16

### Added

#### Child Block Management
- **Nested child block max count function**: Added functionality to manage maximum child block counts in pages.create
- **Enhanced nesting support**: Improved handling of deeply nested block structures
- **Better block organization**: Enhanced support for complex page structures

### Technical Details

#### Child Block Counting
- **Maximum count enforcement**: Ensures child block counts stay within API limits
- **Nesting validation**: Validates nested block structures
- **Performance optimization**: Optimized handling of large block hierarchies

---

## [1.3.17] - 2025-05-12

### Added

#### Payload Size Management
- **500KB payload limit handling**: Added comprehensive handling for Notion's 500KB payload limit
- **Automatic chunking**: Implemented automatic payload chunking for large requests
- **Enhanced request splitting**: Improved algorithm for splitting large requests into smaller chunks

### Technical Details

#### Payload Management
- **Size calculation**: Accurate calculation of payload sizes
- **Chunking algorithm**: Intelligent splitting of large payloads
- **Request optimization**: Optimized request structure for better performance
- **Error recovery**: Enhanced error handling for payload size issues

---

## [1.3.16] - 2024-10-18

### Added

#### TypeScript Support
- **Full TypeScript integration**: Added comprehensive TypeScript support with type definitions
- **Type definitions**: Generated TypeScript declaration files for better IDE support
- **Build system integration**: Integrated TypeScript compilation into build process

### Changed

#### Project Structure
- **Source reorganization**: Moved all source files to `src/` directory
- **Build configuration**: Added TypeScript configuration and build scripts
- **Package structure**: Updated package.json with TypeScript support

### Technical Details

#### TypeScript Implementation
- **Type definitions**: Complete type definitions for all functions and interfaces
- **Build process**: Automated TypeScript compilation
- **IDE support**: Enhanced autocomplete and error checking
- **Documentation**: TypeScript-aware documentation generation

---

## [1.3.15] - 2024-10-10

### Added

#### Advanced Block Support
- **Column list support**: Added support for column_list blocks with proper handling
- **Table support**: Enhanced table block support with improved functionality
- **Recursive block handling**: Improved recursive handling of nested block structures

### Changed

#### Block Appending Logic
- **Enhanced appendBlocks**: Updated appendBlocks to handle complex block types
- **Improved recursion**: Better recursive handling of child blocks
- **API limit compliance**: Ensures all blocks stay within Notion API limits

### Technical Details

#### Column List Implementation
- **Structure preservation**: Maintains column list structure during operations
- **Child block handling**: Proper handling of child blocks within columns
- **API compliance**: Ensures column lists meet API requirements

#### Table Enhancements
- **Table structure**: Improved table creation and manipulation
- **Cell management**: Better handling of table cells and content
- **Formatting preservation**: Maintains table formatting and structure

---

## Previous Releases

*Additional historical releases would be documented here as needed*
