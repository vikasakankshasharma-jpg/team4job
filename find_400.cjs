const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('smoke_trace_extracted/0-trace.network');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      if (obj.snapshot && obj.snapshot.response && obj.snapshot.response.status === 400) {
        console.log(`400 BAD REQUEST: ${obj.snapshot.request.method} ${obj.snapshot.request.url}`);
        console.log(`Response Object: ${JSON.stringify(obj.snapshot.response.content)}`);
        console.log(`Request PostData: ${JSON.stringify(obj.snapshot.request.postData)}`);
      }
    } catch (e) {}
  }
}

processLineByLine();
