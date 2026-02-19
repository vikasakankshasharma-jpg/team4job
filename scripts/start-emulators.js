#!/usr/bin/env node
/**
 * Standalone Firebase Emulator Starter
 * Bypasses firebase CLI, uses emulator SDK directly
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Firestore emulator
const startFirestoreEmulator = () => {
  console.log('Starting Firestore Emulator on port 8080...');
  return spawn('java', [
    '-Xmx512m',
    '-Dgcloud.project=dodo-beta',
    '-jar',
    path.join(__dirname, '../node_modules/@firebase/database/dist/firestore-emulator.jar'),
    '--port=8080'
  ], { stdio: 'inherit' }).on('error', (err) => {
    console.error('Firestore emulator error:', err);
    process.exit(1);
  });
};

// For testing purposes, just check if emulator jars exist
console.log('Checking for Firebase emulator files...');
console.log('Current directory:', process.cwd());
console.log('firebase.json exists:', fs.existsSync('firebase.json'));

// Try spawning with firebase CLI as fallback
console.log('\nAttempting firebase emulators:start...');
const firebae = spawn('firebase', ['emulators:start'], { 
  stdio: ['pipe', 'inherit', 'inherit'],
  shell: true
});

firebae.on('exit', (code) => {
  if (code !== 0) {
    console.error('Firebase emulators exited with code', code);
  }
});

// Keep process alive
process.on('SIGTERM', () => {
  console.log('Terminating emulator process');
  firebae.kill();
  process.exit(0);
});
