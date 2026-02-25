import { spawn } from'node:child_process';

const command = '"n`nn`n" | pnpm create vite react-todo-app --template react-ts';
const cwd = process.cwd();

const child = spawn(command, {
cwd,
stdio: 'inherit', // 实时输出到控制台
shell: 'powershell.exe',
});

let errorMsg = '';

child.on('error', (error) => {
 errorMsg = error.message;
});

child.on('close', (code) => {
if (code === 0) {
   process.exit(0);
} else {
    if (errorMsg) {
        console.error(`错误: ${errorMsg}`);
    }
    process.exit(code || 1);
  }
});