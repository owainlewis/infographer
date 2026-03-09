import { resolve, join, basename } from "path";
import { rename, access, mkdir } from "fs/promises";

const PROJECT_ROOT = resolve(import.meta.dir, "../..");

function usage() {
  console.log(`
  Usage: bun run move <file> <folder>

  Moves an infographic into a subfolder of infographics/.

  Examples:
    bun run move infographics/foo.html archive
    bun run move infographics/drafts/bar.html posted
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2 || args.includes("--help") || args.includes("-h")) {
    usage();
    process.exit(args.includes("--help") || args.includes("-h") ? 0 : 1);
  }

  const [sourcePath, targetFolder] = args;
  const absSource = resolve(PROJECT_ROOT, sourcePath);

  // Verify source exists
  try {
    await access(absSource);
  } catch {
    console.error(`  Error: File not found: ${sourcePath}`);
    process.exit(1);
  }

  // Create target directory
  const targetDir = join(PROJECT_ROOT, "infographics", targetFolder);
  await mkdir(targetDir, { recursive: true });

  // Move the file
  const filename = basename(absSource);
  const absDest = join(targetDir, filename);

  // Check if destination already exists
  try {
    await access(absDest);
    console.error(`  Error: File already exists: infographics/${targetFolder}/${filename}`);
    process.exit(1);
  } catch {
    // Good — destination doesn't exist
  }

  await rename(absSource, absDest);

  console.log(`\n  Moved: ${sourcePath} → infographics/${targetFolder}/${filename}\n`);
}

main();
