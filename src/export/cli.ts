import { exportPng } from "./png";

const args = process.argv.slice(2);

function printUsage() {
  console.log(`
  Infographer Export CLI

  Usage:
    bun run export <file.html> [options]

  Options:
    --png          Export as 2x PNG (default)
    --output <dir> Output directory (default: output)
    --theme <name> Theme override (default: dark-minimal)
    --help         Show this help

  Examples:
    bun run export infographics/control-vs-data-plane.html
    bun run export infographics/api-architectural-styles.html --png
`);
}

async function main() {
  if (args.length === 0 || args.includes("--help")) {
    printUsage();
    process.exit(0);
  }

  const htmlPath = args[0];
  if (!htmlPath || htmlPath.startsWith("--")) {
    console.error("Error: Please provide an HTML file path");
    printUsage();
    process.exit(1);
  }

  const outputDir =
    args.includes("--output") ?
      args[args.indexOf("--output") + 1] :
      "output";

  const theme =
    args.includes("--theme") ?
      args[args.indexOf("--theme") + 1] :
      "dark-minimal";

  try {
    await exportPng(htmlPath, outputDir, theme);
  } catch (error) {
    console.error("Export failed:", error);
    process.exit(1);
  }
}

main();
