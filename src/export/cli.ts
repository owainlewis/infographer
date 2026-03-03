import { exportPng } from "./png";
import { exportGif } from "./gif";

const args = process.argv.slice(2);

function printUsage() {
  console.log(`
  Infographer Export CLI

  Usage:
    bun run export <file.html> [options]

  Options:
    --png          Export as 2x PNG (default)
    --gif          Export as animated GIF
    --all          Export both PNG and GIF
    --output <dir> Output directory (default: output)
    --help         Show this help

  Examples:
    bun run export infographics/control-vs-data-plane.html --png
    bun run export infographics/api-architectural-styles.html --gif
    bun run export infographics/api-styles-sandwich.html --all
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

  const doPng = args.includes("--png") || args.includes("--all");
  const doGif = args.includes("--gif") || args.includes("--all");

  // Default to PNG if no format specified
  const defaultPng = !doPng && !doGif;

  try {
    if (doPng || defaultPng) {
      await exportPng(htmlPath, outputDir);
    }

    if (doGif) {
      await exportGif(htmlPath, outputDir);
    }
  } catch (error) {
    console.error("Export failed:", error);
    process.exit(1);
  }
}

main();
