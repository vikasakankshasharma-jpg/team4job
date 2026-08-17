const fs = require("fs");
const path = require("path");

function processDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith(".ts")) {
            let content = fs.readFileSync(fullPath, "utf8");
            let modified = false;
            
            content = content.replace(/(timeout:\s*)(\d+)/g, (match, p1, p2) => {
                let val = parseInt(p2, 10);
                if (val < 1000) return match; 
                let newVal = val * 3;
                if (newVal < 60000) newVal = 60000;
                modified = true;
                return p1 + newVal;
            });

            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log("Updated", fullPath);
            }
        }
    });
}

processDir(path.join(__dirname, "tests"));
