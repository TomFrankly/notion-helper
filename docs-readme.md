# Notion Helper Documentation

Welcome to the Notion Helper documentation! This library provides a heaping spoonful of syntactic sugar for the Notion API.

## Quick Start

```javascript
import NotionHelper from 'notion-helper';

// Simple page creation
const page = NotionHelper.createNotionBuilder()
  .parentDb('your-database-id')
  .title('Name', 'My New Page')
  .paragraph('Hello, Notion!')
  .build();
```

## What You'll Find Here

- **Quick Functions** - Simple utilities for common tasks like `quickPages()`, `makeParagraphBlocks()`, and `buildRichTextObj()`
- **Builder Interface** - Powerful fluent interface via `createNotionBuilder()` for complex page construction
- **API Requests** - Functions for making Notion API calls with automatic pagination and error handling
- **Page Metadata** - Property and metadata creation functions for all Notion property types
- **Block Creation** - Support for all available Notion block types (paragraphs, headings, lists, media, etc.)
- **Utilities** - Helper functions for validation, string handling, and API limits

## Key Features

- ✨ **Fluent Interface** - Chain methods to build complex pages easily
- 🧱 **All Block Types** - Support for every Notion block type
- 📱 **Browser Compatible** - Works in both Node.js and browser environments
- 🔗 **Nested Structures** - Handle complex nested content automatically
- 📦 **Size Aware** - Automatically handles Notion's API limits
- 🔧 **TypeScript Ready** - Full type definitions included

## Browser Usage

This library works in **both Node.js and browser environments**!

### Node.js Usage (Standard)
```javascript
import NotionHelper from 'notion-helper';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const page = NotionHelper.createNotionBuilder()
  .parentDb('database-id')
  .title('Name', 'My Page')
  .build();

const result = await notion.pages.create(page.content);
```

### Browser Usage (Frontend)
```javascript
import NotionHelper from 'notion-helper';

// Create your page structure
const page = NotionHelper.createNotionBuilder()
  .parentDb('database-id')
  .title('Name', 'My Page')
  .paragraph('Created in the browser!')
  .build();

// Send to your backend API (since browsers can't directly call Notion API)
const response = await fetch('/api/create-notion-page', {
  method: 'POST',
  body: JSON.stringify(page.content)
});
```

**Important**: Browsers can't directly call the Notion API due to CORS restrictions. You'll need a backend proxy or serverless function to handle the actual API calls.

## Need Help?

- Check out the [full Browser Usage Guide](https://github.com/TomFrankly/notion-helper/blob/main/BROWSER_USAGE.md) on GitHub
- See the [GitHub repository](https://github.com/TomFrankly/notion-helper) for more examples
- Review the API reference below for detailed method documentation

--- 