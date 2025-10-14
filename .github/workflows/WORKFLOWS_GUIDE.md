# GitHub Actions Workflows 使用指南

本项目包含三个 GitHub Actions 工作流，用于自动化构建和发布 Auto Cursor 应用程序。

---

## 📋 工作流概览

| 工作流文件 | 用途 | 触发方式 | 构建平台 |
|-----------|------|---------|---------|
| `build.yml` | 基础构建和发布 | 手动触发 | Linux, Windows |
| `quick-build.yml` | 快速构建单平台 | 手动触发（可选平台） | 任意单个平台 |
| `release-to-public.yml` | 发布到公开仓库 | Tag 推送或手动 | Linux, Windows |

---

## 1️⃣ build.yml - 基础构建和发布

### 功能说明
这是主要的构建工作流，用于构建多平台应用并创建 GitHub Release。

### 触发条件
```yaml
workflow_dispatch  # 手动触发
```

### 构建平台
- ✅ **Linux x64** (Ubuntu 22.04)
- ✅ **Windows x64** (Windows Latest)
- ⚠️ **macOS** (已注释，暂不支持)

### 构建产物
| 平台 | 文件类型 | 文件名示例 |
|------|---------|-----------|
| Linux | `.deb`, `.AppImage` | `auto-cursor_x86_64.deb` |
| Windows | `.exe`, `.msi` | `auto-cursor.exe` |

### 使用步骤

#### 方法1：通过 GitHub 网页界面
1. 访问仓库的 **Actions** 标签页
2. 点击左侧 **"Build and Release"**
3. 点击右侧 **"Run workflow"** 按钮
4. 选择分支（通常是 `main`）
5. 点击 **"Run workflow"** 确认

#### 方法2：通过 GitHub CLI
```bash
gh workflow run build.yml
```

### 产物下载

#### 下载步骤
1. 在 **Actions** 页面找到对应的 workflow 运行记录
2. 点击进入运行详情页面
3. 向下滚动到页面底部的 **Artifacts** 区域
4. 点击对应平台的 artifact 名称进行下载
5. 下载的是 `.zip` 压缩文件，解压后即可找到安装包

#### 产物文件名格式
- `auto-cursor-{平台}-{架构}.zip`
  - 例如：`auto-cursor-linux-x86_64.zip`
  - 例如：`auto-cursor-windows-x86_64.zip`

#### Artifacts 位置说明
```
GitHub Actions 运行页面
  └─ Summary (摘要)
  └─ Jobs (任务列表)
  └─ Run details (运行详情)
  └─ Annotations (注释/警告)
  └─ Artifacts ← 在这里！构建完成后会显示可下载的文件
```

### 工作流程图
```
1. 拉取代码 (Checkout)
   ↓
2. 安装 Node.js + pnpm
   ↓
3. 安装前端依赖 (pnpm install)
   ↓
4. 安装 Rust 工具链
   ↓
5. 安装平台依赖 (Linux only)
   ↓
6. 构建前端 (pnpm build)
   ↓
7. 清理不需要的平台文件
   ↓
8. 构建 Tauri 应用
   ↓
9. 准备构建产物
   ↓
10. 上传到 Artifacts
```

---

## 2️⃣ quick-build.yml - 快速构建单平台

### 功能说明
快速构建工具，适合开发阶段测试单个平台的构建。

### 触发条件
```yaml
workflow_dispatch  # 手动触发，带平台选择参数
```

### 平台选项
- `current` (默认) - **默认构建 Windows x64** 版本
- `linux` - Linux x64
- `windows` - Windows x64
- ~~`macos-intel`~~ (已注释)
- ~~`macos-m1`~~ (已注释)

> **💡 提示**：`current` 选项现在默认构建 Windows 版本，因为这是最常用的平台。如果需要其他平台，请明确选择 `linux` 或 `windows`。

### 使用步骤

#### 方法1：通过 GitHub 网页界面
1. 访问 **Actions** → **"Quick Build (Current Platform)"**
2. 点击 **"Run workflow"**
3. 在 **"Platform to build for"** 下拉菜单中选择平台：
   - `current` - **构建 Windows x64**（默认推荐）
   - `linux` - 构建 Linux 版本
   - `windows` - 构建 Windows 版本（与 current 相同）
4. 点击 **"Run workflow"** 确认

#### 方法2：通过 GitHub CLI
```bash
# 构建当前平台
gh workflow run quick-build.yml

# 构建指定平台
gh workflow run quick-build.yml -f platform=linux
gh workflow run quick-build.yml -f platform=windows
```

### 产物下载

#### 下载步骤（图文说明）
1. 在 **Actions** 页面找到你运行的 workflow
2. 点击进入运行详情页面
3. 向下滚动找到 **Artifacts** 区域
4. 点击 artifact 名称（如 `auto-cursor-quick-build-linux`）下载
5. 下载的是一个 `.zip` 文件，解压后可以找到安装包

#### 产物文件名格式
- `auto-cursor-quick-build-{平台}.zip`

#### 如果显示 "No artifacts"
这是因为构建过程中没有找到产物文件。请检查：
- 构建日志中是否有错误
- Tauri 构建步骤是否成功完成
- 更新到最新版本的 workflow 文件（已修复产物收集问题）

### 适用场景
- ✅ 快速测试构建是否成功
- ✅ 开发阶段验证单个平台
- ✅ 节省 CI/CD 时间（不构建所有平台）
- ❌ 不适合正式发布

---

## 3️⃣ release-to-public.yml - 发布到公开仓库

### 功能说明
自动构建并发布到公开的 GitHub 仓库，用于分发给用户下载。

### 触发条件
```yaml
push:
  tags: ["v*"]     # Tag 推送触发 (如 v1.0.0)
workflow_dispatch  # 手动触发
```

### 构建平台
- ✅ **Linux x64**
- ✅ **Windows x64**

### 使用步骤

#### 方法1：通过 Git Tag 自动触发（推荐）
```bash
# 1. 创建版本标签
git tag v1.0.0

# 2. 推送标签到 GitHub
git push origin v1.0.0

# 3. GitHub Actions 自动触发构建和发布
```

#### 方法2：手动触发
1. 访问 **Actions** → **"Release to Public Repository"**
2. 点击 **"Run workflow"**
3. 选择分支
4. 点击 **"Run workflow"** 确认

### 发布目标
- **公开仓库**: `wuqi-y/auto-cursor-releases`
- **Release 内容**:
  - 自动生成的 Release Notes
  - 各平台安装包
  - 安装说明文档

### 前置配置要求

#### 需要配置的 Secret
在仓库的 **Settings** → **Secrets and variables** → **Actions** 中添加：

| Secret 名称 | 说明 | 获取方式 |
|------------|------|---------|
| `PUBLIC_REPO_TOKEN` | 公开仓库的访问令牌 | [创建 Personal Access Token](https://github.com/settings/tokens) |

#### Token 权限要求
创建 Personal Access Token 时需要勾选：
- ✅ `repo` (完整仓库访问权限)
- ✅ `write:packages` (如果需要发布包)

#### 配置步骤
1. 访问 [GitHub Token 设置](https://github.com/settings/tokens/new)
2. 填写 Token 描述：`Auto Cursor Release Token`
3. 选择过期时间（建议：1年或无过期）
4. 勾选 `repo` 权限
5. 点击 **"Generate token"**
6. 复制生成的 Token
7. 前往仓库 **Settings** → **Secrets** → **New repository secret**
8. Name: `PUBLIC_REPO_TOKEN`
9. Value: 粘贴刚才复制的 Token
10. 点击 **"Add secret"**

### 修改公开仓库地址
如果需要修改发布目标仓库，编辑 `release-to-public.yml`:

```yaml
# 第 191 行
repository: wuqi-y/auto-cursor-releases  # 改为你的仓库地址
```

---

## 🔧 通用配置说明

### pyBuild 目录清理
所有工作流都会清理不需要的平台文件：

```bash
# 构建 Linux 时，删除 macOS 和 Windows 的 pyBuild
# 构建 Windows 时，删除 macOS 和 Linux 的 pyBuild
# 目的：减小最终构建包大小
```

### Rust 缓存
使用 `swatinem/rust-cache@v2` 加速构建：
- 自动缓存 Cargo 依赖
- 大幅缩短构建时间

### 依赖版本
| 工具 | 版本 |
|------|------|
| Node.js | 20 |
| pnpm | 8 |
| Rust | stable |

---

## 📊 工作流对比

| 特性 | build.yml | quick-build.yml | release-to-public.yml |
|------|-----------|----------------|----------------------|
| 多平台构建 | ✅ | ❌ | ✅ |
| 创建 Release | ✅ (Tag时) | ❌ | ✅ |
| 发布到公开仓库 | ❌ | ❌ | ✅ |
| 构建速度 | 慢 | 快 | 慢 |
| 适用场景 | 正式构建 | 开发测试 | 公开发布 |

---

## 🎯 使用建议

### 开发阶段
```bash
# 使用 quick-build 快速验证
gh workflow run quick-build.yml -f platform=linux
```

### 准备发布
```bash
# 1. 更新版本号（如在 package.json, Cargo.toml 等）
# 2. 提交代码
git add .
git commit -m "chore: bump version to 1.0.0"

# 3. 创建并推送 tag
git tag v1.0.0
git push origin v1.0.0

# 4. release-to-public.yml 自动触发
```

### 测试构建
```bash
# 手动触发完整构建（不发布）
gh workflow run build.yml
```

---

## 🐛 故障排查

### 问题1：构建失败 - 依赖安装错误
**解决方案**：
- 检查 `pnpm-lock.yaml` 是否提交
- 确保 `package.json` 中的依赖版本正确

### 问题2：Rust 编译错误
**解决方案**：
- 检查 `Cargo.toml` 配置
- 查看 `src-tauri/` 下的 Rust 代码是否有语法错误

### 问题3：发布到公开仓库失败
**解决方案**：
- 检查 `PUBLIC_REPO_TOKEN` 是否配置
- 验证 Token 权限是否正确
- 确认公开仓库地址是否存在

### 问题4：macOS 构建失败
**原因**：macOS 构建已被注释禁用
**解决方案**：
- 如需启用，取消 `build.yml` 中 macOS 相关行的注释
- 注意：macOS 构建需要 Apple 开发者证书签名

---

## 📝 修改建议

### 启用 macOS 构建
1. 编辑 `build.yml` 和 `release-to-public.yml`
2. 取消第 20-29 行的注释
3. 配置 Apple 开发者证书（如需签名）

### 添加自动发布到 Release
如果希望 `build.yml` 也能创建 Release：
```yaml
# 取消 build.yml 第 3-5 行的注释
on:
  push:
    tags: ["v*"]
```

### 自定义构建参数
修改 Tauri 构建参数：
```yaml
# 在 Build Tauri app 步骤中添加
with:
  args: ${{ matrix.args }} --verbose  # 添加详细输出
```

---

## 🔗 相关链接

- [Tauri GitHub Actions 文档](https://tauri.app/v1/guides/building/cross-platform)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [pnpm 文档](https://pnpm.io/)
- [Rust 工具链文档](https://rust-lang.github.io/rustup/)

