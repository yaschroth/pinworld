const fs = require('fs');
let content = fs.readFileSync('index.ts', 'utf8');

// Fix the YouTube handling section  
content = content.replace(
  /pageContent = `YouTube Video Title: \${data\.title \|\| 'N\/A'}\nAuthor: \${data\.author_name \|\| 'N\/A'}`/,
  "extractedLocation = data.location || ''\n            pageContent = data.content"
);

fs.writeFileSync('index.ts', content);
console.log('Updated YouTube handling section');
