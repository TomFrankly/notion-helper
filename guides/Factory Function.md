# Quick Guide: Using the createNotion Factory Function

The `createNotion` factory function provides a fluent interface for creating Notion pages and blocks. Here's how to use it:

## Basic Usage

Import and create a builder instance:

```javascript
import { createNotion } from "notion-helper";
const notion = createNotion();
```

Chain methods to build your page or block structure:

```js
notion
    .dbId("your-database-id")
    .title("Page Title", "My New Page")
    .paragraph("This is a paragraph.")
    .build();
```

The build() method returns an object with content and additionalBlocks properties.

## Examples

### Simple Example: Creating a basic page

```js
const notion = createNotion();

const result = notion
  .dbId('your-database-id')
  .title('Page Title', 'My First Notion Page')
  .richText('Description', 'This is a page created with the Notion builder.')
  .date('Due Date', '2023-12-31')
  .heading1('Welcome to My Page')
  .paragraph('This is the first paragraph of my page.')
  .bulletedListItem('First item in a list')
  .bulletedListItem('Second item in a list')
  .build();

console.log(result.content);
```

### Block Nesting Example

```js
const notion = createNotion();

const result = notion
  .dbId('your-database-id')
  .title('Page Title', 'Nested Blocks Example')
  .heading1('Top Level Heading')
  .paragraph('This is a top-level paragraph.')
  .startParent('toggle', 'Click to expand')
    .paragraph('This paragraph is inside the toggle.')
    .startParent('bulleted_list_item', 'Nested list')
      .paragraph('This paragraph is inside a bullet point.')
    .endParent()
    .paragraph('Back to toggle level.')
  .endParent()
  .paragraph('Back to top level.')
  .build();

console.log(result.content);
```

### Chaining with Input Data

```js
const notion = createNotion();

const todoItems = [
  { task: 'Buy groceries', due: '2023-06-01', status: 'Not started' },
  { task: 'Finish project', due: '2023-06-15', status: 'In progress' },
  { task: 'Call mom', due: '2023-06-02', status: 'Not started' },
];

const result = notion
  .dbId('your-database-id')
  .title('Page Title', 'My Todo List')
  .heading1('Tasks')
  .paragraph('Here are my upcoming tasks:');

todoItems.forEach(item => {
  notion
    .toDo(item.task)
    .date('Due Date', item.due)
    .select('Status', item.status);
});

const finalResult = notion.build();

console.log(finalResult.content);
```

Remember:

- Use startParent() and endParent() for nested blocks.
- The build() method returns the final result and resets the builder.
- Check result.additionalBlocks for any blocks exceeding the maximum limit per request.
- Refer to the specific block type documentation for detailed options.