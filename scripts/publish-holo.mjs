// Puts the verified Prism holo on the Pages site, beside the game: <site>/app.holo and <site>/app.json.
//
//   node scripts/publish-holo.mjs <model-dir> <site-dir> <build-report.json>
//
// <build-report.json> is what `prism-code build --json` printed in <model-dir>. The Prism registry
// (UOR-Foundation/prism-registry) finds a Pages site that serves app.json, naming this repository, beside app.holo.
// It also builds the same holo from source and verifies it, replaying every acceptance example, before it lists the
// app in the Prism App Store and Foundry.
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [modelDir, siteDir, reportPath] = process.argv.slice(2);
if (!modelDir || !siteDir || !reportPath) {
  console.error('usage: node scripts/publish-holo.mjs <model-dir> <site-dir> <build-report.json>');
  process.exit(64);
}

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const { artifact, address, page } = report.summary ?? {};
if (!report.ok || !artifact || !address) {
  console.error(`the build report is not a passing build with an artifact: ${JSON.stringify(report.diagnostics ?? [])}`);
  process.exit(1);
}
if (page !== 'authored') {
  console.error(`the holo carries the ${page} page, not the game: is ${modelDir}/view/ built?`);
  process.exit(1);
}

const description = /^description\s*=\s*"([^"]*)"/m.exec(readFileSync(join(modelDir, 'prism.toml'), 'utf8'))?.[1] ?? '';
const title = /<title>([^<]*)<\/title>/i.exec(readFileSync(join(modelDir, 'view', 'index.html'), 'utf8'))?.[1].trim();
const text = (html) => html?.replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[e]);
const slug = process.env.GITHUB_REPOSITORY;
if (!slug) {
  console.error('GITHUB_REPOSITORY is not set: run this in GitHub Actions, or set it to owner/name');
  process.exit(64);
}
const [owner, name] = slug.split('/');
const live = `https://${owner.toLowerCase()}.github.io/${name}/`;

copyFileSync(join(modelDir, artifact), join(siteDir, 'app.holo'));
const meta = {
  name: text(title) || name,
  purpose: description,
  live,
  repository: `https://github.com/${slug}`,
  holo: 'app.holo',
  address,
  holospace: `https://hologram-technologies.github.io/holospace-shell/space.html#app=${address}&holo=${live}app.holo`,
};
writeFileSync(join(siteDir, 'app.json'), `${JSON.stringify(meta, null, 2)}\n`);
console.log(`published ${artifact} as ${siteDir}/app.holo (${address}) with ${siteDir}/app.json`);
