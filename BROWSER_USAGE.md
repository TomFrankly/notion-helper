# Browser Usage Guide

The Notion Helper library is now available for use in browser environments! This guide explains how to use it in frontend applications.

## Installation

### Via npm (for bundlers like Webpack, Vite, etc.)

```bash
npm install notion-helper
```

### Via CDN (for direct browser usage)

```html
<script type="module">
  import NotionHelper from 'https://unpkg.com/notion-helper@latest/dist/browser/index.js';
  // Use NotionHelper here
</script>
```

## Usage Examples

### ES Modules (Recommended)

```javascript
import NotionHelper from 'notion-helper';

// Or import specific functions
import { 
  buildRichTextObj, 
  paragraph, 
  heading1, 
  page_meta 
} from 'notion-helper';

// Create rich text
const richText = buildRichTextObj("Hello, World!", {
  bold: true,
  color: "blue"
});

// Create blocks
const blocks = [
  heading1("My Heading"),
  paragraph("This is a paragraph.")
];
```

### Browser Script Tag

```html
<!DOCTYPE html>
<html>
<head>
  <title>Notion Helper Example</title>
</head>
<body>
  <script type="module">
    import NotionHelper from './dist/browser/index.js';
    
    const { paragraph, heading1 } = NotionHelper;
    
    const blocks = [
      heading1("Welcome"),
      paragraph("This was created in the browser!")
    ];
    
    console.log(blocks);
  </script>
</body>
</html>
```

## Making API Calls

Since browsers can't directly make requests to the Notion API due to CORS restrictions, you'll need to:

1. **Use a backend proxy** - Create an endpoint on your server that forwards requests to Notion
2. **Use a serverless function** - Deploy functions on Vercel, Netlify, or similar platforms
3. **Use the official Notion SDK in your backend** - Keep API calls server-side

### Example with Custom API Function

```javascript
import { createPage, appendBlocks } from 'notion-helper';

// Custom API function that calls your backend
async function customApiCall(endpoint, options) {
  const response = await fetch(`/api/notion/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options.body)
  });
  
  return response.json();
}

// Use with notion-helper
const pageData = {
  parent: { database_id: "your-database-id" },
  properties: {
    title: { title: [{ text: { content: "New Page" } }] }
  }
};

const newPage = await createPage(customApiCall, pageData);
```

## Available Functions

All the same functions available in the Node.js version work in the browser:

### Block Creation
- `paragraph()`, `heading1()`, `heading2()`, `heading3()`
- `bulletedListItem()`, `numberedListItem()`
- `callout()`, `quote()`, `code()`
- `image()`, `video()`, `audio()`, `file()`
- `bookmark()`, `embed()`, `pdf()`
- `table()`, `tableRow()`, `columnList()`, `column()`
- `toDo()`, `toggle()`, `divider()`

### Rich Text
- `buildRichTextObj()`

### Page Metadata
- `page_meta()`, `page_props()`
- `title()`, `richText()`, `checkbox()`, `date()`
- `email()`, `files()`, `multiSelect()`, `number()`
- `people()`, `phoneNumber()`, `relation()`, `select()`
- `status()`, `url()`

### Utilities
- `isSingleEmoji()`, `isValidURL()`, `validateImageURL()`
- `validateVideoURL()`, `validateAudioURL()`, `validatePDFURL()`
- `enforceStringLength()`, `validateDate()`
- `getDepth()`, `getTotalCount()`, `getLongestArray()`

### API Helpers
- `createPage()`, `appendBlocks()` (require custom API function)

## Browser Compatibility

The library works in all modern browsers that support:
- ES Modules
- TextEncoder API
- Fetch API (for custom API calls)

This includes:
- Chrome 61+
- Firefox 60+
- Safari 10.1+
- Edge 16+

## Example Projects

Check out the `examples/browser-example.html` file for a complete working example that demonstrates all the main features.

## Limitations

1. **No direct Notion API access** - Browsers can't directly call the Notion API due to CORS
2. **No file system access** - Use File API or drag-and-drop for file handling
3. **No Node.js modules** - Only browser-compatible APIs are available

## TypeScript Support

The library includes TypeScript definitions that work in both Node.js and browser environments:

```typescript
import { paragraph, heading1, BlockObject } from 'notion-helper';

const blocks: BlockObject[] = [
  heading1("TypeScript Example"),
  paragraph("This is type-safe!")
];
``` 