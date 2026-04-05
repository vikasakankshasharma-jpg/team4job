const fs = require('fs');
const path = require('path');

const walk = function(dir, done) {
  let results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    let i = 0;
    (function next() {
      let file = list[i++];
      if (!file) return done(null, results);
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
};

walk('./scripts', function(err, results) {
  if (err) throw err;
  results.forEach(file => {
    if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs') || file.endsWith('.sh') || file.endsWith('.ps1')) {
      let content = fs.readFileSync(file, 'utf8');
      if (content.includes('team4job-live')) {
        let updated = content.replace(/team4job-live/g, 'team4job-live');
        fs.writeFileSync(file, updated);
        console.log(`Updated ${file}`);
      }
    }
  });
});
