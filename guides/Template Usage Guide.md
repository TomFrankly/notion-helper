# Template Usage Guide: Working with Notion Data Source Templates
This guide provides a tutorial and best practices for using the Notion-Helper library to apply data source templates when creating new pages via the Notion API.

## Overview

The Notion API allows you to apply existing data source templates to new pages you create. Notion-Helper makes this even easier, providing options for automatic handling of templates and multiple levels of control.

Note that working with templates via the API introduces conplexity that you don't normally encounter when working with other API methods. This is due to the fact that the API does not allow you to send page children in a page-creation request that applies a template.

Instead, you're expected to wait, verify that the template has finished applying, and then apply any additional child blocks.

Notion-Helper helps you do this by giving you **two levels of control**:

1. **Request-Level:** – The automatic, done-for-you method. Uses either a pre-set delay or a callback to handle block-append timing. *(Library Default)*
2. **Builder-Level:** – The manual option. When creating page objects via the builder, all child blocks are moved to `additionalBlocks`, allowing you to fully control when they are appended to a created page.

Let's explore each level in detail and see some code examples.

## Creating Pages with Request-Level Control (Library Default)

The `creatPage()` method (which is an alias for `request.pages.create()`) gives you *several* tools for appending blocks after applying a template. 

For each method, let's assume you've created a page object using `createNotionBuilder()`. We'll also assume you've created a `notion` client object.

**To enabled request-level control, simply set `handleTemplatePageChildren: false` when configuring the builder.** I also recommend setting `limitChildren: false` and `limitNesting: false`, which prevents the builder from moving blocks that go beyond the Notion API's default request limits into the `additionalBlocks` property. These two settings are always recommended when using the `createPage()` method, since it intelligently handles all request limits.

```javascript
import { createNotionBuilder } from "notion-helper";
import { Client } from "@notionhq/client"

const secret = process.env.NOTION_KEY;
const notion = new Client({ auth: secret });

const builder = createNotionBuilder({
    limitChildren: false,
    limitNesting: false,
    handleTemplatePageChildren: false,
}); // handleTemplatePageChildren defaults to false if you don't specify it

const templatePage = builder
    .parentDataSource('your-data-source-id')
    .template('your-template-id')
    .title('Name', 'Task from Template')
    .paragraph('This content will be handled by request.pages.create()')
    .toDo('A task')
    .build();
```

From here, you have several ways in which you can handle appending blocks:

1. Wait a certain number of milliseconds before automatically appending (simplest)
2. Fetch the template page and compare its structure to your created page
3. Create a webhook subscription and wait for a `page.content_updated` event

### Method 1: Wait, Then Append

The simplest method to handle automatic block-appending is waiting for a certain number of milliseconds, then just going for it. 

This will likely work in 95% of cases, but is inherently more prone to error compared to actually comparing the page against the structure of the template (shown later in this guide), or waiting for a webhook event.

Use this by providing a `templateWaitMs` value to `createPage()`.

```javascript
import { createPage } from "notion-helper";

const result = await createPage({
    data: templatePage.content,
    client: notion,
    templateWaitMs: 3000, // Wait 3 seconds for template processing
});

// Children are automatically appended after template processing
console.log('Page created:', result.apiResponse.id);
console.log('Children appended:', result.appendedBlocks);
```

### Method 2: Compare the Page Against the Template

This is a more robust method. Instead of just waiting for a few seconds and then appending child blocks without truly checking if the template is fully applied, here you compare the template page itself against the created page.

The example code gets the **number of top-level blocks** on the template page. If your create page has the same number, the template is considered successfully applied, and child blocks are then appended.

If necessary, you could do an even stricter comparison – for example, comparing block types, content, property values, etc. However, comparing top-level block count is likely all you need in most cases. 

Notion provides a helpful `collectDataSourceTemplates` function in their SDK you can use for this. It's not necessary if your request provides an exact template ID, but you'll need it if your request uses "default" for the template.

Note how the sample `verifyTemplateReady()` function will throw an error if any step in the validation process fails. `createPage()` will throw this error up the call stack, so you can decide how to handle it in your code. You may decide to stop execution of your own code, or just proceed with attempting to append blocks anyway (in which case the Notion API will throw an error if appending fails).

```javascript
import { createPage } from "notion-helper"
import { collectDataSourceTemplates } from "@notionhq/client"

// Sample verification helper function
async function verifyTemplateReady({ 
  template,
  dataSourceId,
  createdPageId, 
  client, 
  options = {} 
}) {
  const { 
    maxRetries = 3, 
    waitMs = 2000 
  } = options;
  
  console.log('⏳ Verifying template content is ready...');
  
  // Validate template object
  if (!template || typeof template !== 'object' || !template.hasOwnProperty('type')) {
    throw new Error('Template verification failed: template object is invalid or missing required "type" property');
  }
  
  // Determine template ID based on template type
  let templateId;
  
  if (template.type === 'template_id') {
    templateId = template.template_id;
    if (!templateId) {
      throw new Error('Template verification failed: Missing template_id for template.type "template_id"');
    }
    console.log(`   Using template_id: ${templateId}`);
  } else if (template.type === 'default') {
    console.log('   Fetching default template from data source...');
    try {
      const templates = await collectDataSourceTemplates(client, {
        data_source_id: dataSourceId
      });
      const defaultTemplate = templates.find(t => t.is_default);
      if (defaultTemplate) {
        templateId = defaultTemplate.id;
        if (!templateId) {
          throw new Error('Template verification failed: Default template found but it has no id');
        }
        console.log(`   Found default template: ${defaultTemplate.name} (${templateId})`);
      } else {
        throw new Error('Template verification failed: No default template found in the provided data source');
      }
    } catch (error) {
      throw new Error(`Template verification failed: Could not fetch templates (${error.message})`);
    }
  } else if (template.type === 'none') {
    throw new Error('Template verification failed: Template type is "none", nothing to verify.');
  } else {
    throw new Error(`Template verification failed: Unknown template type "${template.type}"`);
  }
  
  // Get template block count
  let templateBlockCount;
  try {
    const templateBlocks = await client.blocks.children.list({
      block_id: templateId,
      page_size: 100 // Note: If your template has >100 top-level blocks, you'll need pagination here
    });
    templateBlockCount = templateBlocks.results.length;
    console.log(`   Template has ${templateBlockCount} top-level blocks`);
  } catch (error) {
    throw new Error(`Template verification failed: Could not fetch template blocks (${error.message})`);
  }
  
  // Verify created page has same structure (with retries)
  let retries = 0;
  let verified = false;
  let currentBlockCount = 0;
  
  while (retries <= maxRetries && !verified) {
    await new Promise(resolve => setTimeout(resolve, waitMs));
    let pageBlocks;
    try {
      pageBlocks = await client.blocks.children.list({
        block_id: createdPageId,
        page_size: 100
      });
      currentBlockCount = pageBlocks.results.length;
    } catch (error) {
      throw new Error(`Template verification failed: Could not fetch page blocks for verification attempt ${retries + 1} (${error.message})`);
    }
    
    console.log(`   Attempt ${retries + 1}/${maxRetries + 1}: Page has ${currentBlockCount} blocks`);
    
    if (currentBlockCount >= templateBlockCount) {
      verified = true;
      console.log('✓ Template content verified!');
    } else {
      retries++;
    }
  }
  
  if (!verified) {
    throw new Error(
      `Template verification failed after ${maxRetries + 1} attempts. ` +
      `Expected at least ${templateBlockCount} blocks but found ${currentBlockCount}.`
    );
  }
}

// Use the verification callback
const result = await createPage({
    data: templatePage.content,
    client: notion,
    templateWaitMs: 0, // Set to 0 since verification callback handles waiting
    onTemplatePageCreated: async ({ page, template, fallbackWaitMs }) => {
        console.log(`✓ Template page created: ${page.id}`);
        console.log(`✓ Page URL: https://www.notion.so/${page.id.replace(/-/g, '')}`);
        
        // Verify template is ready before appending children
        await verifyTemplateReady({
            template: template,
            dataSourceId: data_source_id,
            createdPageId: page.id,
            client: notion,
            options: {
                maxRetries: 3,
                waitMs: 2000
            }
        });
    }
});

console.log('✓ Page creation complete!');
console.log('✓ Template verification passed!');
```

### Method 3: Wait for a Webhook

Rather than comparing against the template page's content, you can listen for a `page.content_updated` or `page.created` webhook.

See the [Notion API guidance on this](https://developers.notion.com/docs/creating-pages-from-templates#webhook-setup) for more details.

Note how their team still recommends retrieving block children from the created page when receiving a `page.created` event!

### Method 4: Manual Control (Still using `createPage()`)

The `createPage()` function has a `skipAutoAppendOnTemplate` that you can set to `true` if you want. When you do (and when a template object is present in the request), `createPage()` will not append block children at all. Instead, they are returned by the function within a `pendingChildren` property.

This is very similar to the Builder-Level Control method described below, but is more suitable for applications already using `createPage()` to create pages.

```javascript
const result = await createPage({
    data: templatePage.content,
    client: notion,
    skipAutoAppendOnTemplate: true
});

// Manually verify template is ready before appending children
if (result.pendingChildren && result.pendingChildren.length > 0) {
    // Your custom verification logic here
    await verifyTemplateReady(result.pageId);
    
    // Append children manually
    await appendBlocks({
        block_id: result.pageId,
        children: result.pendingChildren,
        client: notion
    });
}
```

## Creating Pages with Builder-Level Control (Manual Block Appending)

If you're only using Notion-Helper's fluent interface for building page objects, and you're not using `createPage()` to assist with page-creation, then you can handle templates at the builder level.

This is conceptually much simpler that everything above. By setting `handleTemplatePageChildren: true`, all child blocks will moved to the `additionalBlocks` property in the return object of `createNotionBuilder()`, and any `children` property will be deleted from the created page object.

If you do use this method, you may still find the `appendBlocks()` function useful for handling Notion's various request limits when appending the child blocks (e.g. nesting limits).

```javascript
import { createNotionBuilder, createPage, appendBlocks } from "notion-helper"

const builder = createNotionBuilder({ 
    limitChildren: false,
    limitNesting: false,
    handleTemplatePageChildren: true // ALL children go to additionalBlocks
});

const templatePage = builder
    .parentDataSource('your-data-source-id')
    .template('your-template-id')
    .title('Name', 'Task from Template')
    .paragraph('This content will be in additionalBlocks')
    .toDo('Complete task', false)
    .build();

// Create page first (no children in request)
const result = await createPage({
    data: templatePage.content,
    client: notion,
});

const newPage = result.apiResponse; // This is the created Notion page object

// Manually append blocks at your own pace
if (templatePage.additionalBlocks && templatePage.additionalBlocks.length > 0) {
    for (const blockChunk of templatePage.additionalBlocks) {
        await appendBlocks({
            block_id: newPage.id,
            children: blockChunk
        });
    }
}
```

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

## Handling Default Templates Before Page Creation

**Important**: When using `template: 'default'`, the Notion API will fail with a 400 error if the data source doesn't have a default template set. It's a good idea to check your data source to see if it has a default template **before** sending the page-creation request.

Here's how to use `collectDataSourceTemplates()` from `@notionhq/client` to verify a default template exists, and gracefully fall back if it doesn't:

```javascript
import { collectDataSourceTemplates } from "@notionhq/client";

// Check for default template before building page
let pageBuilder = createNotionBuilder()
    .parentDataSource(data_source_id);

try {
    const templates = await collectDataSourceTemplates(notion, {
        data_source_id: data_source_id
    });
    
    // Check if a default template exists
    const hasDefault = templates.some(t => t.is_default);
    
    if (hasDefault) {
        // Safe to use default template
        pageBuilder = pageBuilder.template('default');
        console.log('✓ Using default template');
    } else {
        // No default template - create page without template
        console.log('⚠️ No default template found, creating page without template');
    }
} catch (error) {
    console.warn('Could not fetch templates, creating page without template:', error.message);
}

// Continue building your page...
const page = pageBuilder
    .title('Name', 'My Task')
    .paragraph('This is a task description')
    .toDo('Complete task', false)
    .build();

// Create the page - templateWaitMs is only used if a template exists
const result = await request.pages.create({
    data: page.content,
    client: notion,
    templateWaitMs: 3000 // Only applied if template exists
});
```

**Alternative: Get explicit default template ID**

For more control, fetch the default template ID and use it explicitly as a `template_id`:

```javascript
let templateId = null;

try {
    const templates = await collectDataSourceTemplates(notion, {
        data_source_id: data_source_id
    });
    
    const defaultTemplate = templates.find(t => t.is_default);
    
    if (defaultTemplate) {
        templateId = defaultTemplate.id;
        console.log(`✓ Found default template: ${defaultTemplate.name}`);
    } else {
        console.log('⚠️ No default template found');
    }
} catch (error) {
    console.warn('Could not fetch templates:', error.message);
}

// Build page with explicit template ID or no template
const pageBuilder = createNotionBuilder()
    .parentDataSource(data_source_id);

if (templateId) {
    pageBuilder.template(templateId); // Use explicit template ID
} else {
    console.log('Creating page without template');
}

const page = pageBuilder
    .title('Name', 'My Task')
    .paragraph('Task content')
    .build();

const result = await request.pages.create({
    data: page.content,
    client: notion,
    templateWaitMs: 3000 // Only applied if template exists
});
```
