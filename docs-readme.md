# notion-helper Documentation

Welcome to the notion-helper documentation. This library provides a heaping spoonful of syntactic sugar for the Notion API.

It primarily gives you a fluent interface for quickly building JSON to create Notion blocks, pages, and property values.

You'll also find functions that can intelligently make API calls for creating new pages and appending blocks. Pass these a valid client object or API call function, and they'll handle the comlicated process of splitting blocks into chunks to deal with the Notion API's limits.

## Quick Start

Create a page:

```javascript
import { createNotionBuilder, createPage } from 'notion-helper';
import { Client } from '@notionhq/client';

const page = createNotion()
  .parentDataSource("your-data-source-id")
  .title("Name", "Charmander")
  .icon("https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png")
  .richText("Category", "Lizard Pokémon")
  .quote("Obviously prefers hot places. When it rains, steam is said to spout from the tip of its tail.")
  .build()

const client = new Client({
  auth: process.env.NOTION_API_KEY
})

const response = await createPage({
  data: page.content,
  client: client,
})
```

See the [notion-helper](https://notion-helper.framer.website/) website for more examples.

## Browser Usage

This library works in **both Node.js and browser environments**!

### Node.js Usage (Standard)
```javascript
import NotionHelper from 'notion-helper';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const page = NotionHelper.createNotionBuilder()
  .parentDataSource('data-source-id')
  .title('Name', 'My Page')
  .build();

const result = await notion.pages.create(page.content);
```

### Browser Usage (Frontend)
```javascript
import NotionHelper from 'notion-helper';

// Create your page structure
const page = NotionHelper.createNotionBuilder()
  .parentDataSource('data-source-id')
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

### 🎮 Try the Interactive Example

Want to see it in action? Check out our **[Interactive Browser Example](./examples/browser-example.html)** that lets you run code and see the JSON output in real-time!

--- 