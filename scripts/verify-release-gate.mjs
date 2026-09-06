#!/usr/bin/env node

const requiredJobs = ['quality', 'migration-replay', 'browser'];
const results = new Map(
  process.argv.slice(2).map((argument) => {
    const separator = argument.indexOf('=');
    return separator === -1
      ? [argument, '']
      : [argument.slice(0, separator), argument.slice(separator + 1)];
  }),
);

const failures = requiredJobs.filter((job) => results.get(job) !== 'success');

if (failures.length > 0) {
  for (const job of failures) {
    console.error(`Required release job ${job} did not succeed (result: ${results.get(job) || 'missing'}).`);
  }
  process.exitCode = 1;
} else {
  console.log('All required release jobs succeeded.');
}
