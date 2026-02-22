#!/usr/bin/env node
/* Minimal Markdown -> Substack (ProseMirror-ish) doc converter.
 * Supports:
 * - #..###### headings
 * - paragraphs
 * - bullet lists (- )
 * - ordered lists (1. )
 * - fenced code blocks ```
 * Output: JSON doc object {type:'doc', content:[...]}
 */

const fs = require('fs');

function headingNode(level, text) {
  return { type: 'heading', attrs: { level }, content: [{ type: 'text', text }] };
}
function paragraphNode(text) {
  return { type: 'paragraph', content: [{ type: 'text', text }] };
}
function codeBlockNode(text) {
  // Substack seems to accept just a paragraph with text in many cases,
  // but we emit a code_block; if rejected, downgrade in the publisher script.
  return { type: 'code_block', attrs: { language: null }, content: [{ type: 'text', text }] };
}

function parse(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const doc = { type: 'doc', content: [] };

  let i = 0;
  let para = [];
  let inCode = false;
  let codeLines = [];

  const flushPara = () => {
    const text = para.join(' ').trim();
    if (text) doc.content.push(paragraphNode(text));
    para = [];
  };

  const flushList = (items, ordered) => {
    if (!items.length) return;
    const listType = ordered ? 'ordered_list' : 'bullet_list';
    doc.content.push({
      type: listType,
      content: items.map((t) => ({
        type: 'list_item',
        content: [paragraphNode(t)]
      }))
    });
    items.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i];

    // code fences
    if (line.trim().startsWith('```')) {
      if (!inCode) {
        flushPara();
        inCode = true;
        codeLines = [];
      } else {
        inCode = false;
        const text = codeLines.join('\n').replace(/\s+$/g, '');
        if (text) doc.content.push(codeBlockNode(text));
        codeLines = [];
      }
      i++;
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      i++;
      continue;
    }

    // headings
    const m = line.match(/^(#{1,6})\s+(.*)$/);
    if (m) {
      flushPara();
      doc.content.push(headingNode(m[1].length, m[2].trim()));
      i++;
      continue;
    }

    // lists
    // gather contiguous bullets or ordered lines
    if (line.match(/^\s*-\s+/)) {
      flushPara();
      const items = [];
      while (i < lines.length && lines[i].match(/^\s*-\s+/)) {
        items.push(lines[i].replace(/^\s*-\s+/, '').trim());
        i++;
      }
      flushList(items, false);
      continue;
    }
    if (line.match(/^\s*\d+\.\s+/)) {
      flushPara();
      const items = [];
      while (i < lines.length && lines[i].match(/^\s*\d+\.\s+/)) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, '').trim());
        i++;
      }
      flushList(items, true);
      continue;
    }

    // blank line
    if (!line.trim()) {
      flushPara();
      i++;
      continue;
    }

    // normal text
    para.push(line.trim());
    i++;
  }

  flushPara();
  return doc;
}

function main() {
  const [,, inPath, outPath] = process.argv;
  if (!inPath) {
    console.error('Usage: md_to_substack_doc.js <in.md> [out.json]');
    process.exit(2);
  }
  const md = fs.readFileSync(inPath, 'utf8');
  const doc = parse(md);
  const out = JSON.stringify(doc);
  if (outPath) fs.writeFileSync(outPath, out);
  else process.stdout.write(out);
}

main();
