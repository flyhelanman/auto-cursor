# 本地开发调试指南

## 📋 环境检查清单

### ✅ 已验证的环境（你的电脑）

| 软件 | 要求版本 | 当前版本 | 状态 |
|------|---------|---------|------|
| Node.js | 18+ | v22.15.0 | ✅ |
| pnpm | 最新 | 10.18.2 | ✅ |
| Rust | 1.70+ | 1.90.0 | ✅ |
| Cargo | 自动 | 1.90.0 | ✅ |
| Python | 3.8+ | 3.12.8 | ✅ |

---

## 🏗️ 项目架构

```
auto-cursor/
├── src/                    # 前端代码 (React + TypeScript)
│   ├── pages/              # 页面组件
│   │   ├── HomePage.tsx           # 主页
│   │   ├── AutoRegisterPage.tsx   # 自动注册页
│   │   ├── TokenManagePage.tsx    # Token管理页
│   │   ├── MachineIdPage.tsx      # 机器ID管理页
│   │   └── AuthCheckPage.tsx      # 认证检查页
│   │
│   ├── components/         # UI组件
│   │   ├── Layout.tsx             # 布局组件
│   │   ├── Button.tsx             # 按钮组件
│   │   ├── Toast.tsx              # 提示组件
│   │   └── ...
│   │
│   ├── services/           # API服务层（调用后端）
│   │   ├── accountService.ts      # 账号服务
│   │   ├── cursorService.ts       # Cursor服务
│   │   ├── usageService.ts        # 使用统计服务
│   │   └── ...
│   │
│   └── App.tsx             # 主应用入口
│
├── src-tauri/              # 后端代码 (Rust)
│   ├── src/
│   │   ├── lib.rs                 # 主入口，定义所有Tauri命令
│   │   ├── account_manager.rs     # 账号管理（注册、登录）
│   │   ├── auth_checker.rs        # 认证检查
│   │   ├── machine_id.rs          # 机器ID管理
│   │   ├── logger.rs              # 日志系统
│   │   └── main.rs                # 程序启动入口
│   │
│   ├── python_scripts/     # Python自动化脚本
│   │   ├── manual_register.py     # 手动注册脚本
│   │   ├── cursor_auth.py         # 认证模块
│   │   └── requirements_minimal.txt  # Python依赖
│   │
│   └── tauri.conf.json     # Tauri配置文件
│
└── package.json            # Node.js依赖配置
```

---

## 🚀 快速启动步骤

### 第1步：安装前端依赖

```powershell
# 在项目根目录执行
pnpm install
```

**说明**：
- 安装所有前端依赖（React、TypeScript、Tailwind等）
- 首次安装需要5-10分钟
- 依赖安装在 `node_modules/` 目录

---

### 第2步：设置Python环境（可选）

如果需要使用自动注册功能，需要设置Python虚拟环境：

```powershell
# 进入Python脚本目录
cd src-tauri/python_scripts

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
.\venv\Scripts\activate

# 安装Python依赖
pip install -r requirements_minimal.txt

# 返回项目根目录
cd ../..
```

**说明**：
- 虚拟环境隔离Python依赖，不影响系统Python
- 如果只调试前端/后端Rust代码，可以跳过此步骤
- Python依赖包括：DrissionPage（浏览器自动化）、requests、faker等

---

### 第3步：启动开发模式

```powershell
# 在项目根目录执行
pnpm tauri dev
```

**这个命令会做什么？**

1. **启动Vite开发服务器** (前端)
   - 监听 `http://localhost:1420`
   - 支持热更新（修改代码自动刷新）

2. **编译Rust代码** (后端)
   - 首次编译需要5-10分钟（编译所有依赖）
   - 后续只编译修改的文件（10-30秒）

3. **启动Tauri应用**
   - 自动打开桌面窗口
   - 窗口中加载前端界面
   - 前后端通过IPC通信

---

## 🔧 调试工具和技巧

### 前端调试

#### 1. 打开开发者工具
- 在应用窗口按 `F12` 或 `Ctrl+Shift+I`
- 会打开Chrome DevTools

#### 2. 查看日志
```typescript
// 在前端代码中添加日志
console.log('调试信息', data);
console.error('错误信息', error);
```

#### 3. 查看网络请求
- DevTools → Network 标签
- 可以看到所有API调用

#### 4. React组件调试
- DevTools → Components 标签（需要React DevTools扩展）
- 查看组件状态和props

---

### 后端调试

#### 方式1：使用println!（最简单，推荐新手）

**优点：** 无需配置，立即可用

```rust
// 在Rust代码中添加日志
println!("📧 调试信息: {:?}", data);
println!("👤 用户: {} {}", first_name, last_name);
eprintln!("❌ 错误信息: {:?}", error);

// 调试带格式的数据
println!("📦 结构体: {:#?}", some_struct);

// 调试执行时间
let start = std::time::Instant::now();
// ... 你的代码 ...
println!("⏱️ 耗时: {:?}", start.elapsed());
```

**查看输出：** 在运行 `pnpm tauri dev` 的终端中查看

#### 方式2：使用断点调试（高级）

**前置条件：** 安装VSCode扩展
- `rust-analyzer` - Rust语言支持
- `CodeLLDB` - LLDB调试器

**使用步骤：**
1. 在代码行号左侧点击，设置红色断点
2. 按 `F5` 启动调试（需要配置 `.vscode/launch.json`）
3. 程序会在断点处暂停
4. 使用 `F10`（单步跳过）、`F11`（单步进入）调试

**调试快捷键：**
- `F5` - 继续执行
- `F10` - 单步跳过
- `F11` - 单步进入
- `Shift+F5` - 停止调试

#### 方式3：使用日志库（生产级）

在 `Cargo.toml` 添加依赖：
```toml
[dependencies]
log = "0.4"
env_logger = "0.11"
```

使用日志宏：
```rust
use log::{info, debug, error};

info!("✅ 一般信息");
debug!("🔍 调试信息");
error!("❌ 错误信息");
```

#### 3. 查看编译错误
- Rust编译错误会实时显示在终端
- 错误信息非常详细，包含行号和建议

---

### Python脚本调试

#### 1. 查看脚本输出
```python
# 在Python脚本中添加日志
print(f"调试信息: {data}")
```

#### 2. 手动运行脚本测试
```powershell
cd src-tauri/python_scripts
.\venv\Scripts\activate
python manual_register.py test@example.com
```

---

## 🔥 热更新说明

| 修改内容 | 是否自动更新 | 更新速度 | 说明 |
|---------|-------------|---------|------|
| React组件 (`.tsx`) | ✅ 是 | 秒级 | 保持应用状态 |
| CSS样式 | ✅ 是 | 秒级 | 立即生效 |
| TypeScript (`.ts`) | ✅ 是 | 秒级 | 自动重新编译 |
| Rust代码 (`.rs`) | ✅ 是 | 10-30秒 | 需要重新编译 |
| Python脚本 (`.py`) | ❌ 否 | - | 需要重启应用 |
| 配置文件 | ❌ 否 | - | 需要重启应用 |

---

## 📝 常见开发场景

### 场景1：修改前端UI

1. 打开文件：`src/pages/HomePage.tsx`
2. 修改代码，保存
3. 应用自动刷新，立即看到效果
4. 按 `F12` 查看控制台日志

### 场景2：添加新的后端功能

1. 打开文件：`src-tauri/src/lib.rs`
2. 添加新的Tauri命令：
```rust
#[tauri::command]
fn my_new_command(param: String) -> Result<String, String> {
    println!("收到参数: {}", param);
    Ok(format!("处理结果: {}", param))
}
```
3. 在 `lib.rs` 的 `run()` 函数中注册命令：
```rust
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        my_new_command,  // 添加这里
        // ... 其他命令
    ])
```
4. 等待Rust重新编译（10-30秒）
5. 在前端调用：
```typescript
import { invoke } from '@tauri-apps/api/core';

const result = await invoke('my_new_command', { param: 'test' });
console.log(result);
```

### 场景3：调试账号注册流程

1. 打开 `src/pages/AutoRegisterPage.tsx`（前端）
2. 打开 `src-tauri/src/account_manager.rs`（后端）
3. 在关键位置添加日志：
```typescript
// 前端
console.log('开始注册', email);
```
```rust
// 后端
println!("收到注册请求: {}", email);
```
4. 在应用中点击注册按钮
5. 查看终端和DevTools的日志输出

---

## 🎯 调试技巧

### 1. 前后端通信调试

**前端调用后端：**
```typescript
import { invoke } from '@tauri-apps/api/core';

try {
    const result = await invoke('backend_command', { 
        param1: 'value1',
        param2: 'value2'
    });
    console.log('后端返回:', result);
} catch (error) {
    console.error('调用失败:', error);
}
```

**后端接收：**
```rust
#[tauri::command]
fn backend_command(param1: String, param2: String) -> Result<String, String> {
    println!("收到参数: {} {}", param1, param2);
    // 处理逻辑
    Ok("成功".to_string())
}
```

### 2. 状态管理调试

使用React DevTools查看Context状态：
```typescript
// src/context/UsageContext.tsx
console.log('Usage状态更新:', usageData);
```

### 3. 数据库调试

查看SQLite数据库：
```rust
// src-tauri/src/machine_id.rs
println!("数据库路径: {:?}", db_path);
println!("查询结果: {:?}", result);
```

---

## ⚠️ 常见问题

### 问题1：端口被占用

**错误信息：**
```
Error: Port 1420 is already in use
```

**解决方法：**
- 关闭占用1420端口的程序
- 或者修改 `vite.config.ts` 中的端口配置

---

### 问题2：Rust编译失败

**错误信息：**
```
error: could not compile `auto-cursor`
```

**解决方法：**
1. 查看终端中的详细错误信息
2. 检查Rust代码语法
3. 确保所有依赖都已安装：`cargo build`

---

### 问题3：Python脚本无法运行

**错误信息：**
```
ModuleNotFoundError: No module named 'xxx'
```

**解决方法：**
```powershell
cd src-tauri/python_scripts
.\venv\Scripts\activate
pip install -r requirements_minimal.txt
```

---

### 问题4：应用窗口无法打开

**可能原因：**
- 前端编译失败
- 后端编译失败
- 端口被占用

**解决方法：**
1. 查看终端错误信息
2. 确保 `pnpm install` 成功
3. 尝试单独启动前端：`pnpm dev`

---

## 🎨 只调试前端（不启动Tauri）

如果只想调试前端UI，不需要后端功能：

```powershell
# 启动Vite开发服务器
pnpm dev
```

然后在浏览器打开：`http://localhost:1420`

**注意：**
- 这种模式下无法调用后端Tauri命令
- 适合纯UI开发和样式调整
- 热更新速度更快

---

## 📦 构建生产版本

开发完成后，构建可执行文件：

```powershell
# 构建Windows版本
pnpm tauri build
```

**构建产物位置：**
- Windows: `src-tauri/target/release/auto-cursor.exe`
- 安装包: `src-tauri/target/release/bundle/`

---

## 🔍 项目关键文件说明

| 文件 | 作用 | 修改频率 |
|------|------|---------|
| `src/App.tsx` | 前端主入口，路由配置 | 低 |
| `src/pages/*.tsx` | 各个页面组件 | 高 |
| `src/services/*.ts` | API服务层，调用后端 | 中 |
| `src-tauri/src/lib.rs` | 后端主入口，命令注册 | 中 |
| `src-tauri/src/*.rs` | 后端业务逻辑 | 高 |
| `src-tauri/tauri.conf.json` | Tauri配置 | 低 |
| `package.json` | 前端依赖配置 | 低 |
| `src-tauri/Cargo.toml` | 后端依赖配置 | 低 |

---

## 📚 推荐学习资源

- **Tauri官方文档**: https://tauri.app/
- **React官方文档**: https://react.dev/
- **Rust官方书**: https://doc.rust-lang.org/book/
- **TypeScript手册**: https://www.typescriptlang.org/docs/

---

## 🎉 开始开发

现在你可以开始开发了！

```powershell
# 1. 安装依赖
pnpm install

# 2. 启动开发模式
pnpm tauri dev

# 3. 按F12打开开发者工具

# 4. 开始修改代码，享受热更新！
```

祝你开发愉快！🚀

