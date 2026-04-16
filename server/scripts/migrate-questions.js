const mongoose = require('mongoose');
const connectDB = require('../src/config/database');
const { runQuestionMigration } = require('../src/services/questionMigration.service');

function parseArgs(argv) {
  const args = new Set(argv);
  const batchArg = argv.find((arg) => arg.startsWith('--batch='));
  const batchSize = batchArg ? parseInt(batchArg.split('=')[1], 10) : 25;

  return {
    apply: args.has('--apply'),
    dryRun: !args.has('--apply'),
    backup: !args.has('--no-backup'),
    useAi: args.has('--ai'),
    batchSize: Number.isFinite(batchSize) && batchSize > 0 ? batchSize : 25,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  await connectDB();

  try {
    const summary = await runQuestionMigration(options);
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Question migration failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
