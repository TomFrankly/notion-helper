# Template Usage Guide: Working with Notion Data Source Templates

This guide covers how to use Notion data source templates with the Notion Helper library, including best practices for production applications.

## Overview

Data source templates in Notion allow you to create pages with predefined content and structure. When using templates via the API, there are important considerations around timing and children block handling that this library addresses with **two levels of control**.

## Two Levels of Template Control

### Level 1: Builder Level (`handleTemplatePageChildren`)

When `handleTemplatePageChildren: true` is set in the builder:
- **All children blocks are moved to `additionalBlocks`**
- **No children are included in the page creation request**
- **You have full manual control** over when and how to append blocks
- **The `request.pages.create()` function won't see any children to handle**

### Level 2: Request Level (Template Parameters)

When `handleTemplatePageChildren: false` (or not specified):
- **Children remain in the page creation request**
- **The `request.pages.create()` function handles template timing automatically**
- **You can use callbacks and wait times** to control template processing

## Basic Template Usage

### Option A: Builder-Level Control (Manual Block Appending)

```javascript
import NotionHelper from "notion-helper";
const { createNotionBuilder } = NotionHelper;

const builder = createNotionBuilder({ 
    handleTemplatePageChildren: true // All children go to additionalBlocks
});

const templatePage = builder
    .parentDataSource('your-data-source-id')
    .template('default')
    .title('Name', 'Task from Template')
    .paragraph('This content will be in additionalBlocks')
    .toDo('Complete task', false)
    .build();

// Create page first (no children in request)
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const newPage = await notion.pages.create(templatePage.content);

// Manually append blocks at your own pace
if (templatePage.additionalBlocks && templatePage.additionalBlocks.length > 0) {
    for (const blockChunk of templatePage.additionalBlocks) {
        await notion.blocks.children.append({
            block_id: newPage.id,
            children: blockChunk
        });
    }
}
```

### Option B: Request-Level Control (Automatic Handling)

```javascript
import NotionHelper from "notion-helper";
const { createNotionBuilder } = NotionHelper;

const builder = createNotionBuilder(); // handleTemplatePageChildren defaults to false

const templatePage = builder
    .parentDataSource('your-data-source-id')
    .template('default')
    .title('Name', 'Task from Template')
    .paragraph('This content will be handled by request.pages.create()')
    .toDo('Complete task', false)
    .build();

// Let request.pages.create() handle template timing and children
const result = await request.pages.create({
    data: templatePage.content,
    client: notion,
    templateWaitMs: 3000 // Automatic wait and append
});
```

### Using Templates in Page Creation

```javascript
const templatePage = builder
    .parentDataSource('your-data-source-id')
    .template('default') // or specific template ID
    .title('Name', 'Task from Template')
    .paragraph('This content will be appended after template processing')
    .toDo('Complete task', false)
    .build();
```

## Template Page Creation Methods

### Method 1: Request-Level Automatic Handling (Recommended for Most Cases)

**Use this when `handleTemplatePageChildren: false` (default)**

```javascript
import { request } from "notion-helper";

const result = await request.pages.create({
    data: templatePage.content,
    client: notion,
    templateWaitMs: 3000, // Wait 3 seconds for template processing
});

// Children are automatically appended after template processing
console.log('Page created:', result.apiResponse.id);
console.log('Children appended:', result.appendedBlocks);
```

### Method 2: Request-Level With Custom Verification Callback

**Use this when `handleTemplatePageChildren: false` (default)**

```javascript
const result = await request.pages.create({
    data: templatePage.content,
    client: notion,
    templateWaitMs: 2000,
    onTemplatePageCreated: async ({ page }) => {
        console.log(`Template page created: ${page.id}`);
        
        // Custom verification logic
        const pageContent = await notion.blocks.children.list({
            block_id: page.id
        });
        
        if (pageContent.results.length > 0) {
            console.log('Template processing appears complete');
        } else {
            console.log('Template still processing...');
        }
        
        // Access parent information if needed
        console.log('Parent data source:', page.parent);
    }
});
```

### Method 3: Request-Level Manual Control (Advanced)

**Use this when `handleTemplatePageChildren: false` (default)**

```javascript
const result = await request.pages.create({
    data: templatePage.content,
    client: notion,
    skipAutoAppendOnTemplate: true
});

// Manually verify template is ready before appending children
if (result.pendingChildren && result.pendingChildren.length > 0) {
    // Your custom verification logic here
    await verifyTemplateReady(result.pageId);
    
    // Append children manually
    await request.blocks.children.append({
        block_id: result.pageId,
        children: result.pendingChildren,
        client: notion
    });
}
```

### Method 4: Builder-Level Manual Control (Full Control)

**Use this when `handleTemplatePageChildren: true`**

```javascript
const builder = createNotionBuilder({ 
    handleTemplatePageChildren: true 
});

const templatePage = builder
    .parentDataSource('your-data-source-id')
    .template('default')
    .title('Name', 'Task from Template')
    .paragraph('This content will be in additionalBlocks')
    .toDo('Complete task', false)
    .build();

// Create page first (no children in request)
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const newPage = await notion.pages.create(templatePage.content);

// Wait for template processing (your custom logic)
await waitForTemplateProcessing(newPage.id);

// Manually append blocks at your own pace
if (templatePage.additionalBlocks && templatePage.additionalBlocks.length > 0) {
    for (const blockChunk of templatePage.additionalBlocks) {
        await notion.blocks.children.append({
            block_id: newPage.id,
            children: blockChunk
        });
    }
}
```

## Choosing Your Approach

### When to Use Builder-Level Control (`handleTemplatePageChildren: true`)

- **Complex template verification** - You need custom logic to verify template processing
- **Batch operations** - Creating many pages and want to control timing precisely
- **Webhook integration** - You're using webhooks to detect template completion
- **Custom retry logic** - You need sophisticated error handling and retries
- **Performance optimization** - You want to create pages first, then append blocks in batches

### When to Use Request-Level Control (`handleTemplatePageChildren: false`)

- **Simple use cases** - Most applications with straightforward template needs
- **Quick prototyping** - You want to get started quickly with minimal setup
- **Standard workflows** - Your template processing follows common patterns
- **Less code** - You prefer the library to handle timing automatically

## Template Types

### Default Template

```javascript
builder.template('default')
```

Uses the data source's default template (if one is set).

### Specific Template by ID

```javascript
builder.template('a5da15f6-b853-455b-81db-d1ef79372b75')
```

Uses a specific template by its UUID.

### Template Object

```javascript
builder.template({
    type: 'template_id',
    template_id: 'a5da15f6-b853-455b-81db-d1ef79372b75'
})
```

Uses a fully-formed template object.

### No Template

```javascript
builder.template('none')
// or simply omit the template() call
```

Creates a page without any template.

## Production Best Practices

### 1. Webhook Integration (Most Reliable)

For production applications, register webhook handlers to detect when template processing is complete:

```javascript
// Set up webhook handler
app.post('/notion-webhook', async (req, res) => {
    const { type, data } = req.body;
    
    if (type === 'page.content_updated') {
        // Template processing is complete
        await handleTemplateReady(data.page_id);
    }
    
    res.status(200).send('OK');
});

// Create page with webhook-based verification
const result = await request.pages.create({
    data: templatePage.content,
    client: notion,
    skipAutoAppendOnTemplate: true,
    onTemplatePageCreated: async ({ page }) => {
        // Store page ID for webhook processing
        await storePendingPage(page.id);
    }
});
```

### 2. Template Content Verification

For critical applications, compare created page content with expected template structure:

```javascript
const result = await request.pages.create({
    data: templatePage.content,
    client: notion,
    onTemplatePageCreated: async ({ page }) => {
        // Fetch template content for comparison
        const templateId = await getTemplateIdFromPage(page);
        const templateBlocks = await notion.blocks.children.list({
            block_id: templateId
        });
        
        // Wait and verify template processing
        let attempts = 0;
        while (attempts < 10) {
            const pageBlocks = await notion.blocks.children.list({
                block_id: page.id
            });
            
            if (pageBlocks.results.length >= templateBlocks.results.length) {
                console.log('Template processing complete');
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
    }
});
```

### 3. Error Handling

Always wrap template operations in proper error handling:

```javascript
try {
    const result = await request.pages.create({
        data: templatePage.content,
        client: notion,
        templateWaitMs: 5000,
        onTemplatePageCreated: async ({ page }) => {
            await verifyTemplateProcessing(page.id);
        }
    });
    
    console.log('Page created successfully:', result.apiResponse.id);
} catch (error) {
    console.error('Template page creation failed:', error);
    
    // Handle specific error cases
    if (error.code === 'validation_error') {
        console.error('Template validation failed - check template ID and permissions');
    }
}
```

## Configuration Options

### templateWaitMs

Controls how long to wait after page creation before appending children:

```javascript
// Short wait for simple templates
templateWaitMs: 1000

// Longer wait for complex templates
templateWaitMs: 5000

// No wait (use callback for verification)
templateWaitMs: 0
```

### onTemplatePageCreated

Callback function for custom verification logic:

```javascript
onTemplatePageCreated: async ({ page }) => {
    // page.id - The created page ID
    // page.parent - Parent data source/database info
    // page.properties - Page properties
    // Custom verification logic here
}
```

### skipAutoAppendOnTemplate

Returns children for manual appending instead of auto-appending:

```javascript
skipAutoAppendOnTemplate: true
// Returns: { apiResponse, pendingChildren, pageId }
```

## Common Patterns

### Batch Template Page Creation

```javascript
const templatePages = [
    { title: 'Task 1', description: 'First task' },
    { title: 'Task 2', description: 'Second task' },
    { title: 'Task 3', description: 'Third task' }
];

const results = await Promise.all(
    templatePages.map(async (pageData) => {
        const page = builder
            .parentDataSource('your-data-source-id')
            .template('default')
            .title('Name', pageData.title)
            .richText('Description', pageData.description)
            .build();
            
        return await request.pages.create({
            data: page.content,
            client: notion,
            templateWaitMs: 2000
        });
    })
);
```

### Template with Conditional Content

```javascript
const createTaskPage = (taskData) => {
    const page = builder
        .parentDataSource('your-data-source-id')
        .template('default')
        .title('Name', taskData.name)
        .select('Priority', taskData.priority);
        
    // Add conditional content based on priority
    if (taskData.priority === 'High') {
        page.callout('High priority task - review immediately', '⚠️');
    }
    
    return page.build();
};
```

## Troubleshooting

### Template Not Found

```javascript
// Check if template exists
const templates = await notion.dataSources.templates.list({
    data_source_id: 'your-data-source-id'
});

console.log('Available templates:', templates.templates);
```

### Template Processing Taking Too Long

```javascript
// Increase wait time or implement retry logic
const result = await request.pages.create({
    data: templatePage.content,
    client: notion,
    templateWaitMs: 10000, // 10 seconds
    onTemplatePageCreated: async ({ page }) => {
        // Implement retry logic
        await retryTemplateVerification(page.id, 5);
    }
});
```

### Children Not Appending

**For Builder-Level Control (`handleTemplatePageChildren: true`):**
```javascript
// Check that additionalBlocks exist and are being processed
const templatePage = builder.build();
console.log('Additional blocks:', templatePage.additionalBlocks);

if (templatePage.additionalBlocks && templatePage.additionalBlocks.length > 0) {
    // Make sure you're appending them manually
    for (const blockChunk of templatePage.additionalBlocks) {
        await notion.blocks.children.append({
            block_id: newPage.id,
            children: blockChunk
        });
    }
}
```

**For Request-Level Control (`handleTemplatePageChildren: false`):**
```javascript
// Check that handleTemplatePageChildren is NOT enabled
const builder = createNotionBuilder(); // Don't set handleTemplatePageChildren: true

// Make sure you're using request.pages.create() with template parameters
const result = await request.pages.create({
    data: templatePage.content,
    client: notion,
    templateWaitMs: 3000 // Ensure wait time is sufficient
});
```

## Migration from Non-Template Pages

If you're migrating existing code to use templates:

### For Simple Migrations (Request-Level Control)
1. **Add template configuration** to your page creation calls
2. **Test with simple templates** first
3. **Implement proper error handling** for template-specific failures

### For Complex Migrations (Builder-Level Control)
1. **Enable `handleTemplatePageChildren: true`** in your builder
2. **Update your page creation flow** to handle `additionalBlocks`
3. **Implement custom template verification** logic
4. **Consider webhook integration** for production reliability

### Migration Example

**Before (Non-template):**
```javascript
const page = builder
    .parentDataSource('data-source-id')
    .title('Name', 'Task')
    .paragraph('Description')
    .build();

const result = await request.pages.create({
    data: page.content,
    client: notion
});
```

**After (Request-Level Control):**
```javascript
const page = builder
    .parentDataSource('data-source-id')
    .template('default') // Add template
    .title('Name', 'Task')
    .paragraph('Description')
    .build();

const result = await request.pages.create({
    data: page.content,
    client: notion,
    templateWaitMs: 3000 // Add template handling
});
```

**After (Builder-Level Control):**
```javascript
const builder = createNotionBuilder({ 
    handleTemplatePageChildren: true 
});

const page = builder
    .parentDataSource('data-source-id')
    .template('default') // Add template
    .title('Name', 'Task')
    .paragraph('Description')
    .build();

// Handle additionalBlocks manually
const newPage = await notion.pages.create(page.content);
if (page.additionalBlocks && page.additionalBlocks.length > 0) {
    for (const blockChunk of page.additionalBlocks) {
        await notion.blocks.children.append({
            block_id: newPage.id,
            children: blockChunk
        });
    }
}
```

Remember:

- Templates require special handling for children blocks
- Always verify template processing is complete before appending children
- Use webhooks for the most reliable production setup
- Test template operations thoroughly before deploying to production
