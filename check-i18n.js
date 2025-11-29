const fs = require('fs');
const path = require('path');

const localesDir = 'xmcl-keystone-ui/locales';

// 解析 YAML 为对象
function parseYaml(content) {
  const result = {};
  const lines = content.split('\n');
  const stack = [{ obj: result, indent: -1 }];
  let multilineKey = null;
  let multilineIndent = 0;
  let multilineValue = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 处理多行字符串
    if (multilineKey !== null) {
      const currentIndent = line.search(/\S/);
      if (currentIndent > multilineIndent || line.trim() === '') {
        multilineValue.push(line);
        continue;
      } else {
        // 多行结束
        const parent = stack[stack.length - 1].obj;
        parent[multilineKey] = multilineValue.join('\n').trim();
        multilineKey = null;
        multilineValue = [];
      }
    }
    
    if (!line.trim() || line.trim().startsWith('#')) continue;
    
    const match = line.match(/^(\s*)(['"]?[^:]+['"]?):\s*(.*)$/);
    if (!match) continue;
    
    const indent = match[1].length;
    // 移除键名的引号
    let key = match[2].trim();
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
      key = key.slice(1, -1);
    }
    let value = match[3].trim();
    
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    
    const parent = stack[stack.length - 1].obj;
    
    if (value === '|' || value === '>' || value === '|-' || value === '>-') {
      multilineKey = key;
      multilineIndent = indent;
      multilineValue = [];
    } else if (value === '' || value === '{}') {
      parent[key] = {};
      stack.push({ obj: parent[key], indent });
    } else {
      // 移除引号
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      parent[key] = value;
    }
  }
  
  return result;
}

// 获取所有键路径
function getAllKeyPaths(obj, prefix = '') {
  let paths = [];
  for (const key in obj) {
    const fullPath = prefix ? prefix + '.' + key : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key]) && Object.keys(obj[key]).length > 0) {
      paths = paths.concat(getAllKeyPaths(obj[key], fullPath));
    } else {
      paths.push(fullPath);
    }
  }
  return paths;
}

// 读取英语文件
const enContent = fs.readFileSync(path.join(localesDir, 'en.yaml'), 'utf8');
const enObj = parseYaml(enContent);
const enKeys = new Set(getAllKeyPaths(enObj));

console.log('英语文件键数量:', enKeys.size);

// 检查所有语言文件
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.yaml') && f !== 'en.yaml');

const results = [];
for (const file of files) {
  const content = fs.readFileSync(path.join(localesDir, file), 'utf8');
  const obj = parseYaml(content);
  const keys = new Set(getAllKeyPaths(obj));
  
  const missing = [...enKeys].filter(k => !keys.has(k));
  
  results.push({
    file,
    total: keys.size,
    missing: missing.length,
    percent: ((enKeys.size - missing.length) / enKeys.size * 100).toFixed(1),
    missingKeys: missing
  });
}

results.sort((a, b) => parseFloat(b.percent) - parseFloat(a.percent));

console.log('\n语言文件完成度:');
console.log('-'.repeat(50));
for (const r of results) {
  console.log(`${r.file.padEnd(15)} ${r.percent}% (缺少 ${r.missing} 键)`);
}
console.log('-'.repeat(50));

// 显示高完成度语言缺失的键
console.log('\n高完成度语言(>=50%)缺失的键:');
for (const r of results) {
  const percent = parseFloat(r.percent);
  if (percent >= 50 && r.missing > 0) {
    console.log(`\n${r.file} 缺少:`);
    r.missingKeys.forEach(k => console.log('  - ' + k));
  }
}
