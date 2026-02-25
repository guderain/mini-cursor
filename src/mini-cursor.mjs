import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import {
  executeCommandTool,
  listDirectoryTool,
  readFileTool,
  writeFileTool,
} from "./all-tools.mjs";
import chalk from "chalk";

const model = new ChatOpenAI({
  modelName: "gpt-5.1-codex-mini",
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const tools = [
  readFileTool,
  writeFileTool,
  executeCommandTool,
  listDirectoryTool,
];

// 绑定工具到模型
const modelWithTools = model.bindTools(tools);

// Agent 执行函数
async function runAgentWithTools(query, maxIterations = 30) {
  const messages = [
    new SystemMessage(`你是一个项目管理助手，使用工具完成任务。

当前工作目录: ${process.cwd()}

工具：
1. read_file: 读取文件
2. write_file: 写入文件
3. execute_command: 执行命令（支持 workingDirectory 参数）
4. list_directory: 列出目录

重要规则 - execute_command：
- workingDirectory 参数会自动切换到指定目录
- 当使用 workingDirectory 时，绝对不要在 command 中使用 cd
- 错误示例: { command: "cd react-todo-app && pnpm install", workingDirectory: "react-todo-app" }
这是错误的！因为 workingDirectory 已经在 react-todo-app 目录了，再 cd react-todo-app 会找不到目录
- 正确示例: { command: "pnpm install", workingDirectory: "react-todo-app" }
这样就对了！workingDirectory 已经切换到 react-todo-app，直接执行命令即可

回复要简洁，只说做了什么`),
    new HumanMessage(query),
  ];

  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.bgGreen(`⏳ 正在等待 AI 思考...`));
    const response = await modelWithTools.invoke(messages);
    messages.push(response);

    // 检查是否有工具调用
    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log(`\n✨ AI 最终回复:\n${response.content}\n`);
      return response.content;
    }

    // 执行工具调用
    for (const toolCall of response.tool_calls) {
      const foundTool = tools.find((t) => t.name === toolCall.name);
      if (foundTool) {
        const toolResult = await foundTool.invoke(toolCall.args);
        messages.push(
          new ToolMessage({
            content: toolResult,
            tool_call_id: toolCall.id,
          }),
        );
      }
    }
  }

  return messages[messages.length - 1].content;
}

const case1 = `创建一个功能丰富的 React TodoList 应用：

1. 创建项目：echo -e "n\nn" | pnpm create vite react-todo-app --template react-ts
二、核心功能（全部必须实现）
1️⃣ Todo 基础功能

✅ 添加 Todo（Enter 提交）

✅ 删除 Todo

✅ 编辑 Todo（双击进入编辑模式）

Enter 保存

Esc 取消

✅ 标记完成 / 取消完成

✅ 使用 crypto.randomUUID() 生成唯一 ID

✅ 显示创建时间（格式化时间）

2️⃣ 拖拽排序（必须实现）

使用 HTML5 Drag & Drop API（不要使用第三方库）

支持拖拽重新排序

拖拽时有透明度变化

拖拽目标高亮

顺序变化后持久化到 localStorage

3️⃣ 分类筛选

All

Active

Completed

要求：

当前选中高亮

平滑过渡动画

使用 TypeScript union type

4️⃣ 统计 + 扩展功能

底部区域包含：

总数量

已完成数量

未完成数量

🗑 清除已完成按钮

空状态提示（无任务时显示插画风格占位）

5️⃣ 数据持久化

使用 localStorage

useEffect 同步

初始化时读取

顺序变化也必须保存

三、暗黑模式（必须实现）

默认跟随系统 prefers-color-scheme

可手动切换

状态保存在 localStorage

使用 CSS 变量实现主题切换

:root {
  --bg: ...
  --card: ...
}

要求：

主题切换有过渡动画

深色模式优雅，不刺眼

四、UI 设计要求（必须高级）

整体风格：

类似 Linear / Notion / Vercel

玻璃拟态 + 微透明效果

背景渐变（蓝 → 紫 → 深蓝）

卡片：

border-radius: 16px

box-shadow 高级柔和阴影

backdrop-filter: blur()

五、动画系统（必须非常流畅）
添加动画：

opacity: 0 → 1

translateY(10px) → 0

0.35s cubic-bezier

删除动画：

渐出 + 向下滑

过渡后再真正删除

拖拽动画：

transform 平滑过渡

使用 transition

Hover 效果：

轻微 scale(1.02)

阴影增强

所有动画必须：

不突兀

使用 ease 或 cubic-bezier

0.2s ~ 0.4s

六、最终目标效果
一个功能丰富的 React TodoList 应用：
- 像真实 SaaS 产品
- UI 高级
- 动画流畅
- 功能完整
`;

try {
  await runAgentWithTools(case1);
} catch (error) {
  console.error(`\n❌ 错误: ${error.message}\n`);
}
