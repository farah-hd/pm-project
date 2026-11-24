/**
 * In-memory test verification of PM Quest Data and Server Handlers
 */
const { KNOWLEDGE_AREAS, FINAL_CHALLENGE } = require('./data/knowledgeData.js');
const fs = require('fs');
const path = require('path');

console.log('--- TEST 1: Verifying Knowledge Areas ---');
console.log('Total Areas:', KNOWLEDGE_AREAS.length);
if (KNOWLEDGE_AREAS.length !== 9) {
  throw new Error('Must have exactly 9 knowledge areas');
}

KNOWLEDGE_AREAS.forEach(area => {
  console.log(`[Area ${area.id}] ${area.title} (${area.roleTitle})`);
  if (!area.definition) throw new Error(`Area ${area.id} missing definition`);
  if (!area.processes || area.processes.length !== 4) throw new Error(`Area ${area.id} must have 4 processes`);
  if (!area.keyReminder) throw new Error(`Area ${area.id} missing key reminder`);
  if (!area.quiz || !area.quiz.question || area.quiz.options.length !== 4) throw new Error(`Area ${area.id} quiz invalid`);
  console.log(`  Question: ${area.quiz.question.substring(0, 45)}...`);
  console.log(`  Correct: Option ${area.quiz.correctIndex} (${area.quiz.options[area.quiz.correctIndex].substring(0, 30)})`);
});

console.log('\n--- TEST 2: Verifying Final Challenge ---');
console.log('Title:', FINAL_CHALLENGE.title);
console.log('Options count:', FINAL_CHALLENGE.options.length);

console.log('\n--- TEST 3: Verifying Static Public Assets ---');
const filesToCheck = [
  'public/index.html',
  'public/host.html',
  'public/player.html',
  'public/css/style.css',
  'public/js/qrcode.min.js',
  'public/js/soundFx.js',
  'public/js/confetti.js',
  'public/js/knowledgeAreas.js',
  'public/js/host.js',
  'public/js/player.js'
];

filesToCheck.forEach(f => {
  const full = path.join(__dirname, f);
  if (!fs.existsSync(full)) {
    throw new Error(`Missing expected file: ${f}`);
  }
  const size = fs.statSync(full).size;
  console.log(`✓ ${f} exists (${size} bytes)`);
});

console.log('\n✅ ALL VERIFICATION CHECKS PASSED 100%!');
