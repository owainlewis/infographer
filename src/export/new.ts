import { resolve, join } from "path";
import { readFile, writeFile, access } from "fs/promises";

const PROJECT_ROOT = resolve(import.meta.dir, "../..");

const LAYOUTS = ["bento", "catalog", "stack"] as const;
const THEMES = ["light", "dark"] as const;

type Layout = (typeof LAYOUTS)[number];
type Theme = (typeof THEMES)[number];

function usage() {
  console.log(`
  Usage: bun run new <title> [options]

  Options:
    --layout <name>   Layout template (default: bento)
                      Choices: ${LAYOUTS.join(", ")}
    --theme <name>    Color theme (default: light)
                      Choices: ${THEMES.join(", ")}

  Examples:
    bun run new "How to Master Docker"
    bun run new "API Gateway Patterns" --layout catalog --theme dark
    bun run new "REST vs GraphQL vs gRPC" --layout 3col
`);
}

function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    usage();
    process.exit(0);
  }

  let title = "";
  let layout: Layout = "bento";
  let theme: Theme = "light";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--layout" && args[i + 1]) {
      const val = args[i + 1] as Layout;
      if (!LAYOUTS.includes(val)) {
        console.error(`  Error: Unknown layout "${val}". Choices: ${LAYOUTS.join(", ")}`);
        process.exit(1);
      }
      layout = val;
      i++;
    } else if (args[i] === "--theme" && args[i + 1]) {
      const val = args[i + 1] as Theme;
      if (!THEMES.includes(val)) {
        console.error(`  Error: Unknown theme "${val}". Choices: ${THEMES.join(", ")}`);
        process.exit(1);
      }
      theme = val;
      i++;
    } else if (!args[i].startsWith("--")) {
      title = args[i];
    }
  }

  if (!title) {
    console.error("  Error: Title is required.\n");
    usage();
    process.exit(1);
  }

  return { title, layout, theme };
}

function titleToFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatTitle(title: string): string {
  // Find the last word and wrap it in accent span
  const words = title.split(" ");
  if (words.length <= 1) {
    return `<span class="accent">${title}</span>`;
  }
  const lastWord = words.pop()!;
  return `${words.join(" ")} <span class="accent">${lastWord}</span>`;
}

async function main() {
  const { title, layout, theme } = parseArgs();

  // Resolve template file (themes are now set via data-theme attribute, not separate files)
  const templateFile = `template-${layout}.html`;
  const templatePath = join(PROJECT_ROOT, "templates", templateFile);

  try {
    await access(templatePath);
  } catch {
    console.error(`  Error: Template not found: templates/${templateFile}`);
    process.exit(1);
  }

  // Generate filename
  const filename = titleToFilename(title) + ".html";
  const outputPath = join(PROJECT_ROOT, "infographics", filename);

  // Check if file already exists
  try {
    await access(outputPath);
    console.error(`  Error: File already exists: infographics/${filename}`);
    process.exit(1);
  } catch {
    // Good — file doesn't exist
  }

  // Read template and apply replacements
  let html = await readFile(templatePath, "utf-8");

  // Replace title
  html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);

  // Replace h1 content
  html = html.replace(
    /<h1>.*?<\/h1>/s,
    `<h1>${formatTitle(title)}</h1>`
  );

  // Set theme via data-theme attribute
  html = html.replace(/data-theme="(dark|light)"/, `data-theme="${theme}"`);

  // Remove REPLACE comments
  html = html.replace(/\s*<!-- REPLACE:.*?-->\s*/g, "\n");

  await writeFile(outputPath, html, "utf-8");

  console.log(`\n  Created: infographics/${filename}`);
  console.log(`  Layout:  ${layout}`);
  console.log(`  Theme:   ${theme}`);
  console.log(`\n  Preview: http://localhost:3000/preview/${filename}\n`);
}

main();
