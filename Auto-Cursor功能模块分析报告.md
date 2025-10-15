# Auto-Cursor 功能模块分析报告

## 项目概述

Auto-Cursor 是一个基于 Tauri 2.0 + React 19.1.0 + Python 的桌面应用程序，专门用于管理 Cursor AI 代码编辑器。项目采用三层架构：前端 React UI 层、后端 Rust 服务层、Python 自动化脚本层。

**技术栈：**
- 前端：React 19.1.0 + TypeScript + TailwindCSS + React Router
- 后端：Rust + Tauri 2.0 (72个 Tauri 命令)
- 脚本：Python 3.x (自动化任务引擎)
- 存储：SQLite + JSON 配置文件

---

## 1. 首页模块分析

### 1.1 核心文件
- **前端**: `src/pages/HomePage.tsx`
- **后端**: `src-tauri/src/lib.rs` (相关 Tauri 命令)

### 1.2 主要功能职责
- Cursor 安装状态检测
- 安装路径显示和验证
- 功能模块导航入口
- 调试信息展示

### 1.3 前端核心逻辑

#### 状态管理
```typescript
const [cursorInstalled, setCursorInstalled] = useState<boolean | null>(null);
const [cursorPaths, setCursorPaths] = useState<[string, string] | null>(null);
const [loading, setLoading] = useState(true);
const [debugInfo, setDebugInfo] = useState<string[]>([]);
const [showDebug, setShowDebug] = useState(false);
```

#### 安装状态检测流程
```typescript
const checkCursorInstallation = async () => {
  try {
    setLoading(true);
    const installed = await CursorService.checkCursorInstallation();
    setCursorInstalled(installed);

    if (installed) {
      // 获取安装路径
      const paths = await CursorService.getCursorPaths(); 
      setCursorPaths(paths);
    } else {
      // 获取调试信息
      const debug = await CursorService.debugCursorPaths();
      setDebugInfo(debug);
    }
  } catch (error) {
    console.error("检查 Cursor 安装失败:", error);
    setCursorInstalled(false);
  } finally {
    setLoading(false);
  }
};
```

### 1.4 后端支持 (Tauri 命令)

```rust
#[tauri::command]
async fn check_cursor_installation() -> Result<bool, String> {
    let restorer = MachineIdRestorer::new().map_err(|e| e.to_string())?;
    Ok(restorer.cursor_installation_exists())
}

#[tauri::command] 
async fn get_cursor_paths() -> Result<(String, String), String> {
    let restorer = MachineIdRestorer::new().map_err(|e| e.to_string())?;
    let (app_path, config_path) = MachineIdRestorer::get_cursor_app_paths()
        .map_err(|e| e.to_string())?;
    Ok((app_path.to_string_lossy().to_string(), 
        config_path.to_string_lossy().to_string()))
}

#[tauri::command]
async fn debug_cursor_paths() -> Result<Vec<String>, String> {
    AuthChecker::debug_cursor_paths()
        .map_err(|e| format!("Failed to debug cursor paths: {}", e))
}
```

### 1.5 UI 组件设计

**条件渲染逻辑：**
- 已安装：显示绿色成功状态 + 路径信息 + 功能入口卡片
- 未安装：显示红色错误状态 + 调试信息按钮 + 排查建议

### 1.6 设计亮点
1. **环境预检**: 作为应用门户验证运行环境
2. **清晰反馈**: 通过颜色和图标提供直观的状态信息
3. **故障排查**: 提供调试工具帮助用户解决安装问题
4. **导航中心**: 为其他功能模块提供统一入口

---

## 2. Machine ID 管理模块分析

### 2.1 核心文件
- **前端**: `src/pages/MachineIdPage.tsx` (890行，功能最复杂)
- **后端**: `src-tauri/src/machine_id.rs` (主要业务逻辑)

### 2.2 核心数据结构

```typescript
interface MachineIds {
  "telemetry.devDeviceId": string;
  "telemetry.macMachineId": string;
  "telemetry.machineId": string;
  "telemetry.sqmId": string;
  "storage.serviceMachineId": string;
}

interface BackupInfo {
  path: string;
  filename: string;
  timestamp: string;
  size: number;
  date_formatted: string;
}

interface RestoreResult {
  success: boolean;
  message: string;
  details: string[];
}

interface ResetResult {
  success: boolean;
  message: string;
  details: string[];
  new_ids?: MachineIds;
}
```

### 2.3 复杂状态管理

```typescript
// 核心步骤状态机
type Step = "menu" | "select" | "preview" | "confirm" | "result" 
         | "reset" | "complete_reset" | "confirm_reset" 
         | "confirm_complete_reset" | "custom_path_config";

const [currentStep, setCurrentStep] = useState<Step>("menu");

// 数据状态
const [backups, setBackups] = useState<BackupInfo[]>([]);
const [selectedBackup, setSelectedBackup] = useState<BackupInfo | null>(null);
const [currentMachineIds, setCurrentMachineIds] = useState<MachineIds | null>(null);
const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
const [resetResult, setResetResult] = useState<ResetResult | null>(null);

// 平台特定状态
const [isWindows, setIsWindows] = useState<boolean>(false);
const [customCursorPath, setCustomCursorPath] = useState<string>("");
```

### 2.4 主要业务流程

#### 2.4.1 当前 Machine ID 读取
```typescript
const loadCurrentMachineIds = async () => {
  try {
    setLoading(true);
    // 并行获取 ID 和文件内容
    const [ids, content] = await Promise.all([
      CursorService.getCurrentMachineIds(),
      CursorService.getMachineIdFileContent(),
    ]);
    setCurrentMachineIds(ids);
    setMachineIdFileContent(content);
  } catch (error) {
    console.error("加载当前 Machine ID 失败:", error);
  } finally {
    setLoading(false);
  }
};
```

#### 2.4.2 备份恢复流程 (多步骤状态机)
```typescript
// 步骤1: 加载备份列表
const loadBackups = async () => {
  const backupList = await CursorService.getBackups();
  setBackups(backupList);
  setCurrentStep("select"); // 转到选择步骤
};

// 步骤2: 选择备份并解析内容  
const handleBackupSelect = async (backup: BackupInfo) => {
  setSelectedBackup(backup);
  const ids = await CursorService.extractBackupIds(backup.path);
  setSelectedIds(ids);
  setCurrentStep("preview"); // 转到预览步骤
};

// 步骤3: 执行恢复
const handleRestore = async () => {
  setCurrentStep("confirm"); // 显示执行中状态
  const result = await CursorService.restoreMachineIds(selectedBackup.path);
  setRestoreResult(result);
  setCurrentStep("result"); // 显示结果
  
  if (result.success) {
    await loadCurrentMachineIds(); // 刷新当前ID
  }
};
```

#### 2.4.3 重置操作 (两种模式)
```typescript
// 普通重置：重新生成 Machine ID
const handleReset = async () => {
  setLoading(true);
  const result = await CursorService.resetMachineIds();
  setResetResult(result);
  setCurrentStep("reset");
  
  if (result.success) {
    await loadCurrentMachineIds();
  }
};

// 完全重置：清除所有 Cursor 数据
const handleCompleteReset = async () => {
  setLoading(true);
  const result = await CursorService.completeResetMachineIds();
  setResetResult(result);
  setCurrentStep("complete_reset");
  
  if (result.success) {
    await loadCurrentMachineIds();
  }
};
```

### 2.5 后端核心实现 (Rust)

```rust
pub struct MachineIdRestorer {
    log_file: PathBuf,
    custom_cursor_path: Option<String>,
}

impl MachineIdRestorer {
    // 获取当前 Machine IDs
    pub fn get_current_machine_ids(&self) -> Result<Option<MachineIds>> {
        let storage_path = self.get_storage_json_path()?;
        if !storage_path.exists() {
            return Ok(None);
        }
        
        let content = fs::read_to_string(&storage_path)?;
        let storage: serde_json::Value = serde_json::from_str(&content)?;
        
        // 提取各个 ID 字段
        let machine_ids = MachineIds {
            dev_device_id: extract_id(&storage, "telemetry.devDeviceId")?,
            mac_machine_id: extract_id(&storage, "telemetry.macMachineId")?,
            machine_id: extract_id(&storage, "telemetry.machineId")?,
            sqm_id: extract_id(&storage, "telemetry.sqmId")?,
            service_machine_id: extract_id(&storage, "storage.serviceMachineId")?,
        };
        
        Ok(Some(machine_ids))
    }

    // 重置 Machine IDs
    pub fn reset_machine_ids(&self) -> Result<ResetResult> {
        // 1. 创建备份
        let backup_path = self.create_backup()?;
        
        // 2. 生成新的 IDs
        let new_ids = self.generate_new_machine_ids()?;
        
        // 3. 更新各个配置文件
        let mut details = Vec::new();
        details.push(format!("✅ 备份已创建: {}", backup_path));
        
        self.update_storage_file(&new_ids)?;
        details.push("✅ 已更新 storage.json".to_string());
        
        self.update_machine_id_file(&new_ids.dev_device_id)?;
        details.push("✅ 已更新 machineId 文件".to_string());
        
        let system_details = self.update_system_ids(&new_ids)?;
        details.extend(system_details);
        
        Ok(ResetResult {
            success: true,
            message: "Machine ID 重置成功".to_string(),
            details,
            new_ids: Some(new_ids),
        })
    }
}
```

### 2.6 Windows 自定义路径支持

```typescript
// 自定义路径配置 (仅 Windows)
const handleSetCustomPath = async () => {
  if (!customCursorPath.trim()) {
    showError("请输入Cursor路径");
    return;
  }

  try {
    const result = await CursorService.setCustomCursorPath(customCursorPath.trim());
    await loadCustomCursorPath(); // 重新加载当前路径
    showSuccess("自定义Cursor路径设置成功");
  } catch (error) {
    showError(`设置自定义路径失败: ${error}`);
  }
};

// 自动检测并填充路径
const handleFillDetectedPath = async () => {
  try {
    const debugInfo = await CursorService.debugWindowsCursorPaths();
    
    // 查找第一个有效的路径
    for (const info of debugInfo) {
      if (info.includes("- package.json: true") && 
          info.includes("- main.js: true")) {
        const pathMatch = info.match(/路径\d+: (.+)/);
        if (pathMatch) {
          const detectedPath = pathMatch[1].trim();
          setCustomCursorPath(detectedPath);
          showSuccess(`已填充检测到的路径: ${detectedPath}`);
          return;
        }
      }
    }
    
    showError("未检测到有效的Cursor安装路径");
  } catch (error) {
    showError(`自动填充路径失败: ${error}`);
  }
};
```

### 2.7 用户体验设计亮点
1. **步骤式操作引导**: 复杂操作分解为多个清晰的步骤
2. **预览确认机制**: 恢复前先预览备份内容避免误操作
3. **实时状态反馈**: 每个操作都有明确的进度和结果显示
4. **平台差异处理**: Windows 下提供自定义路径配置
5. **错误恢复机制**: 操作失败时提供详细的错误信息和调试工具

---

## 3. 授权检查模块分析

### 3.1 核心文件
- **前端**: `src/pages/AuthCheckPage.tsx`
- **后端**: `src-tauri/src/auth_checker.rs` (2061行，复杂的授权验证逻辑)

### 3.2 数据结构定义

```typescript
interface AuthCheckResult {
  success: boolean;
  message: string;
  details: string[];
  user_info?: UserAuthInfo;
}

interface UserAuthInfo {
  is_authorized: boolean;
  token_length: number;
  token_valid: boolean;
  api_status?: number;
  error_message?: string;
  checksum?: string;
  account_info?: AccountInfo;
}

interface AccountInfo {
  email?: string;
  username?: string;
  subscription_type?: string;
  subscription_status?: string;
  trial_days_remaining?: number;
  usage_info?: string;
  aggregated_usage?: AggregatedUsageData; // 聚合用量数据
}

interface AggregatedUsageData {
  aggregations: ModelUsage[];
  total_input_tokens: string;
  total_output_tokens: string;
  total_cache_write_tokens: string;
  total_cache_read_tokens: string;
  total_cost_cents: number;
}

interface ModelUsage {
  model_intent: string;    // 模型类型 (如 "chat", "edit", "generate")
  input_tokens: string;
  output_tokens: string;
  cache_write_tokens: string;
  cache_read_tokens: string;
  total_cents: number;     // 成本（美分）
}
```

### 3.3 前端核心逻辑

#### 3.3.1 Token 自动获取机制
```typescript
const getTokenAuto = async () => {
  try {
    setAutoTokenLoading(true);
    const info = await CursorService.getTokenAuto();
    setTokenInfo(info);

    if (info.token) {
      setUserToken(info.token); // 自动填充到输入框
    }
  } catch (error) {
    console.error("自动获取 token 失败:", error);
  } finally {
    setAutoTokenLoading(false);
  }
};

// 组件初始化时自动获取 Token
useEffect(() => {
  getTokenAuto();
}, []);
```

#### 3.3.2 授权状态检查流程
```typescript
const checkAuthorization = async () => {
  if (!userToken.trim()) {
    alert("请输入 token");
    return;
  }

  try {
    setCheckingAuth(true);
    // 调用后端验证 Token
    const result = await CursorService.checkUserAuthorized(userToken.trim());
    setAuthResult(result);
  } catch (error) {
    console.error("检查授权失败:", error);
  } finally {
    setCheckingAuth(false);
  }
};
```

#### 3.3.3 用量数据展示
```typescript
// 聚合用量数据组件
{authResult.user_info?.account_info?.aggregated_usage && (
  <div className="mt-6">
    <AggregatedUsageDisplay
      aggregatedUsage={authResult.user_info.account_info.aggregated_usage}
      title="📊 聚合用量数据 (最近30天)"
      variant="detailed"
    />
  </div>
)}
```

### 3.4 后端核心实现 (Rust)

#### 3.4.1 JWT Token 验证
```rust
impl AuthChecker {
    pub fn check_user_authorized(token: &str) -> Result<AuthCheckResult, String> {
        let mut details = Vec::new();
        
        // 1. 基础 Token 验证
        let token_length = token.len();
        details.push(format!("🔍 Token 长度: {} 字符", token_length));
        
        // 2. JWT 格式验证
        let token_valid = Self::is_valid_jwt(token);
        details.push(format!("🔍 Token 格式: {}", 
            if token_valid { "✅ 有效的 JWT" } else { "❌ 非 JWT 格式" }));
        
        // 3. API 调用验证
        match Self::verify_token_with_api(token) {
            Ok(account_info) => {
                details.push("🔍 API 验证: ✅ 通过".to_string());
                
                Ok(AuthCheckResult {
                    success: true,
                    message: "授权验证成功".to_string(),
                    details,
                    user_info: Some(UserAuthInfo {
                        is_authorized: true,
                        token_length,
                        token_valid,
                        api_status: Some(200),
                        account_info: Some(account_info),
                        ..Default::default()
                    }),
                })
            }
            Err(e) => {
                details.push(format!("🔍 API 验证: ❌ 失败 - {}", e));
                
                Ok(AuthCheckResult {
                    success: false,
                    message: format!("授权验证失败: {}", e),
                    details,
                    user_info: Some(UserAuthInfo {
                        is_authorized: false,
                        token_length,
                        token_valid,
                        error_message: Some(e),
                        ..Default::default()
                    }),
                })
            }
        }
    }

    // JWT 格式验证
    fn is_valid_jwt(token: &str) -> bool {
        let parts: Vec<&str> = token.split('.').collect();
        if parts.len() != 3 {
            return false;
        }
        
        // 验证每个部分都是有效的 Base64
        parts.iter().all(|part| {
            general_purpose::URL_SAFE_NO_PAD.decode(part).is_ok()
        })
    }
}
```

#### 3.4.2 API 验证和账户信息获取
```rust
fn verify_token_with_api(token: &str) -> Result<AccountInfo> {
    let client = reqwest::blocking::Client::new();
    
    // 调用 Cursor API 验证 Token
    let response = client
        .get("https://www.cursor.com/api/auth/me")
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "cursor-client/0.42.3")
        .send()?;

    let status = response.status();
    let response_text = response.text()?;

    if !status.is_success() {
        return Err(anyhow!("API 调用失败: HTTP {}", status));
    }

    // 解析用户信息
    let user_data: serde_json::Value = serde_json::from_str(&response_text)?;
    
    let account_info = AccountInfo {
        email: user_data.get("email").and_then(|v| v.as_str()).map(|s| s.to_string()),
        username: user_data.get("username").and_then(|v| v.as_str()).map(|s| s.to_string()),
        subscription_type: extract_subscription_type(&user_data),
        subscription_status: extract_subscription_status(&user_data),
        trial_days_remaining: extract_trial_days(&user_data),
        usage_info: extract_usage_info(&user_data),
        aggregated_usage: extract_aggregated_usage(&user_data),
    };

    Ok(account_info)
}
```

#### 3.4.3 Token 自动获取机制
```rust
pub fn get_token_auto() -> TokenInfo {
    // 多种方式尝试获取 Token
    let sources = vec![
        ("VS Code 扩展存储", Self::get_token_from_vscode),
        ("Cursor 配置文件", Self::get_token_from_cursor_config),
        ("系统环境变量", Self::get_token_from_env),
    ];

    for (source_name, get_fn) in sources {
        match get_fn() {
            Ok(Some(token)) => {
                return TokenInfo {
                    token: Some(token),
                    source: source_name.to_string(),
                    found: true,
                    message: "Token 获取成功".to_string(),
                };
            }
            Ok(None) => continue,
            Err(e) => {
                log_debug!("从 {} 获取 Token 失败: {}", source_name, e);
                continue;
            }
        }
    }

    TokenInfo {
        token: None,
        source: "未找到".to_string(),
        found: false,
        message: "未在任何位置找到有效的 Token".to_string(),
    }
}

// 从 Cursor 配置文件获取 Token
fn get_token_from_cursor_config() -> Result<Option<String>> {
    let cursor_config_path = Self::get_cursor_config_path()?;
    let storage_path = cursor_config_path.join("User/globalStorage/storage.json");
    
    if !storage_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&storage_path)?;
    let storage: serde_json::Value = serde_json::from_str(&content)?;
    
    // 查找 authToken 字段
    let token = storage
        .get("authToken")
        .or_else(|| storage.get("cursor.authToken"))
        .or_else(|| storage.get("workbench.authToken"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    
    Ok(token)
}
```

### 3.5 UI 设计特点
1. **自动化体验**: 页面加载时自动尝试获取 Token
2. **手动备选**: 自动获取失败时提供手动输入选项
3. **详细反馈**: 显示 Token 来源、长度、格式等详细信息
4. **调试功能**: 提供详细信息开关帮助排查问题
5. **用量可视化**: 通过专门组件展示用量统计数据

---

## 4. Token 管理模块分析

### 4.1 核心文件
- **前端**: `src/pages/TokenManagePage.tsx` (25112 tokens，项目中最复杂的页面)
- **后端**: `src-tauri/src/account_manager.rs` (账户管理核心逻辑)

### 4.2 复杂状态管理架构

```typescript
// 主要数据状态
const [accountData, setAccountData] = useState<AccountListResult | null>(null);

// UI 控制状态
const [showAddForm, setShowAddForm] = useState(false);
const [showEditForm, setShowEditForm] = useState(false);
const [showQuickSwitchForm, setShowQuickSwitchForm] = useState(false);

// 操作类型状态
const [addAccountType, setAddAccountType] = useState<"token" | "email" | "verification_code">("token");

// 异步操作状态
const [cancelSubscriptionLoading, setCancelSubscriptionLoading] = useState<string | null>(null);
const [manualBindCardLoading, setManualBindCardLoading] = useState<string | null>(null);
const [autoLoginLoading, setAutoLoginLoading] = useState(false);

// 用量数据状态
const [usageModalOpen, setUsageModalOpen] = useState(false);
const [selectedAccountUsage, setSelectedAccountUsage] = useState<{
  account: AccountInfo;
  usageData: AggregatedUsageData | null;
  loading: boolean;
} | null>(null);
```

### 4.3 主要业务功能

#### 4.3.1 账户列表加载和数据增强
```typescript
const loadAccounts = async () => {
  try {
    setLoading(true);
    // 获取基本账户列表
    const result = await AccountService.getAccountList();
    
    if (result.success && result.accounts) {
      setAccountData(result);
      setLoading(false); // 立即显示账户列表
      
      // 异步并发获取每个账户的详细信息
      const enhancedAccounts = await Promise.allSettled(
        result.accounts.map(async (account) => {
          try {
            // 检查授权状态和获取用户信息
            const authResult = await CursorService.checkUserAuthorized(account.token);
            
            return {
              ...account,
              subscription_type: authResult.user_info?.account_info?.subscription_type || "未知",
              subscription_status: authResult.user_info?.account_info?.subscription_status || "未知",
              trial_days_remaining: authResult.user_info?.account_info?.trial_days_remaining || 0,
              last_check: new Date().toISOString(),
            };
          } catch (error) {
            console.error(`获取账户 ${account.email} 详细信息失败:`, error);
            return {
              ...account,
              subscription_type: "检查失败",
              subscription_status: "检查失败",
              trial_days_remaining: 0,
            };
          }
        })
      );

      // 更新带有详细信息的账户列表
      const finalAccounts = enhancedAccounts.map((result, index) => 
        result.status === 'fulfilled' ? result.value : result.accounts[index]
      );
      
      setAccountData({
        ...result,
        accounts: finalAccounts,
      });
    }
  } catch (error) {
    console.error("加载账户失败:", error);
  } finally {
    setLoading(false);
  }
};
```

#### 4.3.2 多种方式添加账户
```typescript
const handleAddAccount = async () => {
  if (!newEmail || !newEmail.includes("@")) {
    setToast({ message: "请输入有效的邮箱地址", type: "error" });
    return;
  }

  try {
    let result;
    
    switch (addAccountType) {
      case "token":
        // 直接使用 Token 添加
        if (!newToken) {
          setToast({ message: "请填写 Token", type: "error" });
          return;
        }
        result = await AccountService.addAccount(
          newEmail, 
          newToken, 
          newRefreshToken || undefined,
          newWorkosSessionToken || undefined
        );
        break;
        
      case "email":
        // 通过邮箱密码自动登录获取 Token
        if (!newPassword) {
          setToast({ message: "请填写密码", type: "error" });
          return;
        }
        
        setAutoLoginLoading(true);
        currentEmailRef.current = newEmail;
        
        // 启动自动登录流程
        result = await invoke("auto_login_and_get_cookie", {
          email: newEmail,
          password: newPassword
        });
        break;
        
      case "verification_code":
        // 使用验证码登录方式
        setAutoLoginLoading(true);
        currentEmailRef.current = newEmail;
        
        result = await invoke("verification_code_login", {
          email: newEmail
        });
        break;
    }
    
    // 处理结果...
  } catch (error) {
    console.error("添加账户失败:", error);
  }
};
```

#### 4.3.3 账户切换 (含 Machine ID 重置)
```typescript
const handleSwitchAccount = async (email: string) => {
  setConfirmDialog({
    show: true,
    title: "切换账户",
    message: `确定要切换到账户 ${email} 吗？`,
    checkboxLabel: "同时重置机器码（推荐，确保账户切换成功）",
    checkboxDefaultChecked: true,
    onConfirm: async (shouldReset?: boolean) => {
      try {
        const shouldResetMachineId = shouldReset ?? true;
        
        if (shouldResetMachineId) {
          // 先重置 Machine ID
          console.log("🔄 正在重置 Machine ID...");
          const resetResult = await CursorService.resetMachineIds();
          if (!resetResult.success) {
            console.error("Machine ID 重置失败:", resetResult.message);
            setToast({ message: `Machine ID 重置失败: ${resetResult.message}`, type: "error" });
            return;
          }
          console.log("✅ Machine ID 重置成功");
        }
        
        // 然后切换账户
        console.log("🔄 正在切换账户...");
        const switchResult = await AccountService.switchAccount(email);
        
        if (switchResult.success) {
          setToast({ message: "账户切换成功", type: "success" });
          await loadAccounts(); // 重新加载账户列表
        } else {
          setToast({ message: switchResult.message, type: "error" });
        }
      } catch (error) {
        console.error("切换账户失败:", error);
        setToast({ message: `切换失败: ${error}`, type: "error" });
      }
    },
  });
};
```

#### 4.3.4 订阅管理功能
```typescript
// 取消订阅
const handleCancelSubscription = async (account: AccountInfo) => {
  if (!account.workos_cursor_session_token) {
    setToast({ message: "该账户缺少WorkOS Session Token，无法取消订阅", type: "error" });
    return;
  }

  setCancelSubscriptionLoading(account.email);
  
  try {
    const result = await AccountService.openCancelSubscriptionPage(
      account.workos_cursor_session_token
    );
    
    if (!result.success) {
      setCancelSubscriptionLoading(null);
      setToast({ message: result.message, type: "error" });
    }
    // 成功情况下通过事件监听器处理
  } catch (error) {
    setCancelSubscriptionLoading(null);
    setToast({ message: `操作失败: ${error}`, type: "error" });
  }
};

// 手动绑卡
const handleManualBindCard = async (account: AccountInfo) => {
  if (!account.workos_cursor_session_token) {
    setToast({ message: "该账户缺少WorkOS Session Token，无法绑定银行卡", type: "error" });
    return;
  }

  setManualBindCardLoading(account.email);
  
  try {
    const result = await AccountService.openManualBindCardPage(
      account.workos_cursor_session_token
    );
    
    if (!result.success) {
      setManualBindCardLoading(null);
      setToast({ message: result.message, type: "error" });
    }
  } catch (error) {
    setManualBindCardLoading(null);
    setToast({ message: `操作失败: ${error}`, type: "error" });
  }
};
```

### 4.4 后端账户管理 (AccountManager)

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountInfo {
    pub email: String,
    pub token: String,
    pub refresh_token: Option<String>,
    pub workos_cursor_session_token: Option<String>,
    pub is_current: bool,
    pub created_at: String,
}

impl AccountManager {
    // 获取账户列表
    pub fn get_account_list() -> AccountListResult {
        match Self::load_accounts() {
            Ok(mut accounts) => {
                // 确定当前账户
                let current_account = Self::determine_current_account(&mut accounts);
                
                AccountListResult {
                    success: true,
                    accounts,
                    current_account,
                    message: "获取账户列表成功".to_string(),
                }
            }
            Err(e) => {
                AccountListResult {
                    success: false,
                    accounts: vec![],
                    current_account: None,
                    message: format!("获取账户列表失败: {}", e),
                }
            }
        }
    }

    // 切换账户
    pub fn switch_account(email: String) -> SwitchAccountResult {
        let mut details = Vec::new();
        
        // 1. 加载账户列表
        let mut accounts = match Self::load_accounts() {
            Ok(accounts) => accounts,
            Err(e) => {
                return SwitchAccountResult {
                    success: false,
                    message: format!("加载账户失败: {}", e),
                    details: vec![],
                };
            }
        };

        // 2. 查找目标账户
        let target_account = match accounts.iter().find(|acc| acc.email == email) {
            Some(account) => account.clone(),
            None => {
                return SwitchAccountResult {
                    success: false,
                    message: format!("未找到账户: {}", email),
                    details: vec![],
                };
            }
        };

        // 3. 更新 Cursor 配置
        match Self::update_cursor_auth(&target_account.token) {
            Ok(cursor_details) => {
                details.extend(cursor_details);
            }
            Err(e) => {
                return SwitchAccountResult {
                    success: false,
                    message: format!("更新Cursor配置失败: {}", e),
                    details,
                };
            }
        }

        // 4. 更新账户状态
        accounts.iter_mut().for_each(|acc| {
            acc.is_current = acc.email == email;
        });

        match Self::save_accounts(&accounts) {
            Ok(_) => {
                details.push("✅ 账户状态更新成功".to_string());
                SwitchAccountResult {
                    success: true,
                    message: "账户切换成功".to_string(),
                    details,
                }
            }
            Err(e) => {
                SwitchAccountResult {
                    success: false,
                    message: format!("保存账户状态失败: {}", e),
                    details,
                }
            }
        }
    }
}
```

### 4.5 用户体验设计亮点
1. **渐进式加载**: 先显示基本信息，再异步获取详细信息
2. **多种添加方式**: Token、邮箱密码、验证码登录三种方式
3. **智能切换**: 切换账户时可选择是否重置 Machine ID  
4. **实时状态管理**: 通过事件系统处理异步操作状态
5. **批量操作**: 支持账户导入导出功能
6. **用量可视化**: 集成用量统计显示
7. **订阅管理**: 集成取消订阅和绑卡功能

---

## 5. 自动注册模块分析

### 5.1 核心文件
- **前端**: `src/pages/AutoRegisterPage.tsx` (1622行，最复杂的功能页面)
- **后端**: `src-tauri/src/lib.rs` (多个注册相关的 Tauri 命令)
- **Python脚本**: `src-tauri/python_scripts/` (自动化注册引擎)

### 5.2 核心数据结构

```typescript
interface RegistrationForm {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

interface RegistrationResult {
  success: boolean | string;
  message: string;
  details?: string[];
  action?: string;
  status?: string;
  output_lines?: string[];
  raw_output?: string;
  error_output?: string;
  accountInfo?: {
    email: string;
    token: string;
    usage: string;
  };
}
```

### 5.3 复杂状态管理

```typescript
// 注册表单状态
const [form, setForm] = useState<RegistrationForm>({
  email: "", firstName: "", lastName: "", password: "",
});

// 邮箱类型选择
const [emailType, setEmailType] = useState<"custom" | "cloudflare_temp" | "outlook">("custom");
const [outlookMode, setOutlookMode] = useState<"default" | "token">("default");
const [outlookEmail, setOutlookEmail] = useState("");

// 注册选项
const [useIncognito, setUseIncognito] = useState(true);
const [enableBankCardBinding, setEnableBankCardBinding] = useState(true);
const [skipPhoneVerification, setSkipPhoneVerification] = useState(false);
const [isUsAccount, setIsUsAccount] = useState(false);

// 批量注册状态
const [batchCount, setBatchCount] = useState(1);
const [batchEmails, setBatchEmails] = useState<string[]>([""]);

// 银行卡管理
const [bankCardList, setBankCardList] = useState<BankCardConfig[]>([]);
const [selectedCardIndex, setSelectedCardIndex] = useState<number>(0);
const [selectedBatchCardIndices, setSelectedBatchCardIndices] = useState<number[]>([0]);

// 实时交互状态
const [isRegistering, setIsRegistering] = useState(false);
const [realtimeOutput, setRealtimeOutput] = useState<string[]>([]);
const [showVerificationModal, setShowVerificationModal] = useState(false);
const [verificationCode, setVerificationCode] = useState("");
```

### 5.4 实时事件监听系统

```typescript
useEffect(() => {
  const setupListeners = async () => {
    // 1. 监听注册输出
    const unlistenOutput = await listen("registration-output", async (event: any) => {
      const data = event.payload;
      
      // 检查是否包含Token信息
      if (data.line.includes("workos_cursor_session_token") && 
          data.line.includes("token") && 
          data.line.includes("user_")) {
        const resObj: any = JSON.parse(data.line);
        
        // 获取客户端访问Token
        const clientToken = await getClientAccessToken(resObj.workos_cursor_session_token);
        
        // 自动添加账户到管理系统
        const result = await AccountService.addAccount(
          resObj.email,
          clientToken.accessToken,
          clientToken.refreshToken,
          resObj.workos_cursor_session_token
        );
        
        if (result.success) {
          setToast({ message: "账户添加成功", type: "success" });
        }
      }
      
      // 更新实时输出
      setRealtimeOutput((prev) => [...prev, data.line]);
    });

    // 2. 监听验证码请求
    const unlistenVerification = await listen("verification-code-required", () => {
      if (isRegisteringRef.current) {
        setShowVerificationModal(true);
        setToast({ message: "请输入验证码", type: "info" });
      }
    });

    // 3. 监听自动获取的验证码
    const unlistenAutoCode = await listen("verification-code-auto-filled", (event: any) => {
      const code = event.payload;
      setVerificationCode(code);
      setToast({ message: `自动获取验证码成功: ${code}`, type: "success" });
    });

    // 4. 监听验证码获取失败
    const unlistenCodeFailed = await listen("verification-code-failed", (event: any) => {
      const error = event.payload;
      setToast({ message: `自动获取验证码失败: ${error}`, type: "error" });
    });

    return () => {
      unlistenOutput();
      unlistenVerification();  
      unlistenAutoCode();
      unlistenCodeFailed();
    };
  };
  
  setupListeners();
}, []);
```

### 5.5 Token 获取机制

```typescript
const getClientAccessToken = (workos_cursor_session_token: string) => {
  return new Promise(async (resolve, reject) => {
    let verifier = base64URLEncode(K);
    let challenge = base64URLEncode(new Uint8Array(await sha256(verifier)));
    let uuid = crypto.randomUUID();
    
    // 轮询获取Token
    let interval = setInterval(() => {
      invoke("trigger_authorization_login_poll", { uuid, verifier })
        .then((res: any) => {
          if (res.success) {
            const data = JSON.parse(res.response_body);
            resolve(data);
            setToast({ message: "token获取成功", type: "success" });
            clearInterval(interval);
          }
        });
    }, 1000);

    // 20秒超时
    setTimeout(() => {
      clearInterval(interval);
      resolve(null);
    }, 20000);

    // 触发授权登录
    invoke("trigger_authorization_login", {
      uuid,
      challenge,
      workosCursorSessionToken: workos_cursor_session_token,
    });
  });
};
```

### 5.6 多种注册方式

#### 5.6.1 自定义邮箱注册
```typescript
if (emailType === "custom") {
  result = await invoke<RegistrationResult>("register_with_email", {
    email: form.email,
    firstName: form.firstName,
    lastName: form.lastName,
    useIncognito: useIncognito,
    enableBankCardBinding: enableBankCardBinding,
    skipPhoneVerification: skipPhoneVerification,
    btnIndex: isUsAccount ? 2 : 1,
    selectedCardIndex: enableBankCardBinding ? selectedCardIndex : undefined,
  });
}
```

#### 5.6.2 Cloudflare临时邮箱注册
```typescript
if (emailType === "cloudflare_temp") {
  result = await invoke<RegistrationResult>("register_with_cloudflare_temp_email", {
    firstName: form.firstName,
    lastName: form.lastName,
    useIncognito: useIncognito,
    enableBankCardBinding: enableBankCardBinding,
    skipPhoneVerification: skipPhoneVerification,
    btnIndex: isUsAccount ? 2 : 1,
    selectedCardIndex: enableBankCardBinding ? selectedCardIndex : undefined,
  });
}
```

#### 5.6.3 批量注册
```typescript
const handleBatchRegister = async () => {
  // 准备批量数据
  const emails: string[] = [];
  const firstNames: string[] = [];
  const lastNames: string[] = [];

  for (let i = 0; i < batchCount; i++) {
    if (emailType === "custom") {
      emails.push(batchEmails[i] || "");
    } else {
      emails.push(""); // 自动生成
    }
    
    // 使用随机姓名或用户输入
    if (useRandomInfo || !form.firstName || !form.lastName) {
      const randomInfo = generateBatchRandomInfo();
      firstNames.push(randomInfo.firstName);
      lastNames.push(randomInfo.lastName);
    } else {
      firstNames.push(form.firstName);
      lastNames.push(form.lastName);
    }
  }

  const result = await invoke<any>("batch_register_with_email", {
    emails,
    firstNames,
    lastNames,
    emailType,
    outlookMode: emailType === "outlook" ? outlookMode : undefined,
    useIncognito,
    enableBankCardBinding,
    skipPhoneVerification,
    btnIndex: isUsAccount ? 2 : 1,
    selectedCardIndices: enableBankCardBinding 
      ? selectedBatchCardIndices.slice(0, batchCount) 
      : undefined,
  });
};
```

### 5.7 后端 Tauri 命令实现

```rust
#[tauri::command]
async fn register_with_email(
    app: tauri::AppHandle,
    email: String,
    first_name: String,
    last_name: String,
    use_incognito: bool,
    enable_bank_card_binding: bool,
    skip_phone_verification: bool,
    btn_index: u32,
    selected_card_index: Option<usize>,
) -> Result<serde_json::Value, String> {
    log_info!("🚀 开始注册账户: {}", email);
    
    // 1. 获取 Python 可执行文件路径
    let python_exe_path = get_python_executable_path(&app)?;
    
    // 2. 准备参数
    let mut args = vec![
        email.clone(),
        first_name,
        last_name,
        use_incognito.to_string(),
        enable_bank_card_binding.to_string(),
        skip_phone_verification.to_string(),
        btn_index.to_string(),
    ];

    // 3. 如果启用银行卡绑定，传递银行卡索引
    if enable_bank_card_binding {
        if let Some(card_index) = selected_card_index {
            args.push(card_index.to_string());
        } else {
            args.push("0".to_string()); // 默认使用第一张卡
        }
    }

    // 4. 启动 Python 注册进程
    let mut child = tokio::process::Command::new(&python_exe_path)
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("启动注册进程失败: {}", e))?;

    // 5. 实时处理输出
    if let Some(stdout) = child.stdout.take() {
        let app_clone = app.clone();
        tokio::spawn(async move {
            let mut reader = BufReader::new(stdout);
            let mut line = String::new();
            
            while reader.read_line(&mut line).await.unwrap_or(0) > 0 {
                let clean_line = line.trim().to_string();
                
                // 发送实时输出事件
                let _ = app_clone.emit("registration-output", 
                    serde_json::json!({ "line": clean_line }));
                
                line.clear();
            }
        });
    }

    // 6. 等待进程完成并返回结果
    let exit_status = child.wait().await
        .map_err(|e| format!("等待进程完成失败: {}", e))?;
    
    if exit_status.success() {
        Ok(serde_json::json!({
            "success": true,
            "message": "注册完成"
        }))
    } else {
        Ok(serde_json::json!({
            "success": false,
            "message": "注册失败"
        }))
    }
}
```

### 5.8 Python 脚本引擎

**核心注册脚本结构：**
- **cursor_register_manual.py**: 主要注册逻辑
- **new_signup.py**: 新账户注册流程
- **email_tabs/**: 邮箱处理模块
  - **tempmail_plus_tab.py**: Cloudflare临时邮箱处理
  - **email_tab_interface.py**: 邮箱接口抽象

### 5.9 银行卡管理集成

```typescript
// 单个注册：单选模式
const handleSingleCardSelection = (index: number) => {
  setSelectedCardIndex(index);
};

// 批量注册：多选模式
const handleBatchCardSelection = (index: number) => {
  setSelectedBatchCardIndices((prev) => {
    if (prev.includes(index)) {
      // 取消选中（但至少保留一个）
      if (prev.length > 1) {
        return prev.filter((i) => i !== index);
      }
      return prev;
    } else {
      // 添加选中
      return [...prev, index].sort((a, b) => a - b);
    }
  });
};
```

### 5.10 用户体验设计
1. **渐进式引导**: 从简单的表单填写到复杂的批量配置
2. **实时反馈**: 注册过程的每一步都有实时日志显示
3. **智能验证**: 自动获取验证码，手动输入作为备选
4. **错误恢复**: 注册失败时提供详细的错误信息和重试机制
5. **配置记忆**: 银行卡和邮箱配置持久化保存
6. **批量优化**: 支持多账户并行注册，提高效率

---

## 6. 虚拟卡生成模块分析（纯前端实现）

### 6.1 核心文件
- **前端**: `src/pages/VirtualCardGeneratorPage.tsx` 
- **工具类**: `src/utils/cardGenerator.ts` (卡号生成算法)

### 6.2 数据结构定义

```typescript
// 生成的卡片结构
interface GeneratedCard {
  cardNumber: string;
  cardExpiry: string;      // 有效期 MM/YY 格式
  cardCvc: string;         // CVC安全码
  cardType: string;        // 卡类型 (Visa/Mastercard等)
  isValid: boolean;        // 卡片是否有效（Luhn校验）
}

// 卡号生成器返回的原始卡片
interface CardGenCard {
  cardNumber: string;
  month: string;
  year: string;
  cvv: string;
}

interface AddressForm {
  billingName: string;                    // 持卡人姓名
  billingCountry: string;                 // 国家
  billingPostalCode: string;              // 邮政编码
  billingAdministrativeArea: string;      // 省份/州
  billingLocality: string;                // 城市
  billingDependentLocality: string;       // 区县
  billingAddressLine1: string;            // 详细地址
}
```

### 6.3 状态管理

```typescript
const [pattern, setPattern] = useState("559888039");  // 卡号模式
const [generateCount, setGenerateCount] = useState(1);  // 生成数量
const [isLoading, setIsLoading] = useState(false);
const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);  // 生成的卡片列表
const [selectedCardIndex, setSelectedCardIndex] = useState<number>(0);  // 当前选中的卡片
const [detectedPattern, setDetectedPattern] = useState<string>("");  // 检测到的模式描述
const [showAddressForm, setShowAddressForm] = useState(false);
const [addressForm, setAddressForm] = useState<AddressForm>({
  billingName: "",
  billingCountry: "China",  // 默认中国
  billingPostalCode: "",
  billingAdministrativeArea: "",
  billingLocality: "",
  billingDependentLocality: "",
  billingAddressLine1: "",
});
```

### 6.4 核心业务流程

#### 6.4.1 虚拟卡生成（纯前端实现）
```typescript
const handleGenerate = () => {
  // 参数验证
  if (!pattern.trim()) {
    setToast({ message: "请输入卡号模式", type: "error" });
    return;
  }

  if (generateCount < 1 || generateCount > 100) {
    setToast({ message: "生成数量应在1-100之间", type: "error" });
    return;
  }

  setIsLoading(true);
  setGeneratedCards([]);
  setSelectedCardIndex(0);

  try {
    // 使用前端卡号生成器
    const generator = new CardGenerator();
    const cards = generator.generateCards(pattern.trim(), generateCount);

    // 转换为前端需要的格式
    const formattedCards: GeneratedCard[] = cards.map((card) => ({
      cardNumber: card.cardNumber,
      cardExpiry: `${card.month}/${card.year}`,
      cardCvc: card.cvv,
      cardType: detectCardType(card.cardNumber),
      isValid: CardGenerator.isValidLuhn(card.cardNumber),
    }));

    setGeneratedCards(formattedCards);
    setToast({
      message: `成功生成 ${formattedCards.length} 张虚拟卡！`,
      type: "success",
    });
  } catch (error: any) {
    console.error("生成虚拟卡失败:", error);
    setToast({
      message: `生成失败: ${error.message || error}`,
      type: "error",
    });
  } finally {
    setIsLoading(false);
  }
};

// 检测卡类型
const detectCardType = (cardNumber: string): string => {
  const firstDigit = cardNumber[0];
  const firstTwoDigits = cardNumber.slice(0, 2);

  if (firstDigit === "4") {
    return "Visa";
  } else if (["51", "52", "53", "54", "55"].includes(firstTwoDigits)) {
    return "Mastercard";
  } else if (["34", "37"].includes(firstTwoDigits)) {
    return "American Express";
  } else if (firstTwoDigits === "62") {
    return "UnionPay";
  } else if (["30", "36", "38", "39"].includes(firstTwoDigits)) {
    return "Diners Club";
  } else if (firstTwoDigits === "35") {
    return "JCB";
  } else if (firstTwoDigits === "60") {
    return "Discover";
  }
  return "Unknown";
};

// 监听模式变化，实时检测模式类型
React.useEffect(() => {
  if (pattern.trim()) {
    const generator = new CardGenerator();
    setDetectedPattern(generator.detectPattern(pattern));
  } else {
    setDetectedPattern("");
  }
}, [pattern]);
```

#### 6.4.2 添加到配置系统
```typescript
const handleAddToConfig = async () => {
  if (generatedCards.length === 0) return;

  const currentCard = generatedCards[selectedCardIndex];
  if (!currentCard) return;

  // 检查现有银行卡配置
  try {
    const existingConfig = await BankCardConfigService.getBankCardConfigList();

    if (existingConfig.cards.length === 0 ||
        !existingConfig.cards[0].billingAddressLine1 ||
        existingConfig.cards[0].billingAddressLine1 === "--") {
      // 没有有效地址，需要用户输入
      setShowAddressForm(true);
      return;
    }

    // 有现有地址，直接使用
    await addCardWithAddress(existingConfig.cards[0]);
  } catch (error) {
    console.error("读取银行卡配置失败:", error);
    setShowAddressForm(true);
  }
};

const addCardWithAddress = async (addressInfo: BankCardConfig | AddressForm) => {
  if (generatedCards.length === 0) return;

  const currentCard = generatedCards[selectedCardIndex];
  if (!currentCard) return;

  try {
    // 读取现有配置
    const existingConfig = await BankCardConfigService.getBankCardConfigList();

    // 创建新卡配置
    const newCard: BankCardConfig = {
      cardNumber: currentCard.cardNumber,
      cardExpiry: currentCard.cardExpiry,
      cardCvc: currentCard.cardCvc,
      billingName: addressInfo.billingName,
      billingCountry: addressInfo.billingCountry,
      billingPostalCode: addressInfo.billingPostalCode,
      billingAdministrativeArea: addressInfo.billingAdministrativeArea,
      billingLocality: addressInfo.billingLocality,
      billingDependentLocality: addressInfo.billingDependentLocality,
      billingAddressLine1: addressInfo.billingAddressLine1,
    };

    // 将新卡添加到最前面
    const updatedConfig = {
      cards: [newCard, ...existingConfig.cards],
    };

    const result = await BankCardConfigService.saveBankCardConfigList(updatedConfig);

    if (result.success) {
      setToast({ message: "虚拟卡已添加到配置！", type: "success" });
      // 从列表中移除已添加的卡片
      const newCards = [...generatedCards];
      newCards.splice(selectedCardIndex, 1);
      setGeneratedCards(newCards);
      setSelectedCardIndex(0);
      setShowAddressForm(false);
    } else {
      setToast({ message: result.message, type: "error" });
    }
  } catch (error) {
    console.error("添加到配置失败:", error);
    setToast({ message: `添加失败: ${error}`, type: "error" });
  }
};
```

#### 6.4.3 地址表单处理
```typescript
const handleAddressSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // 地址验证
  if (!addressForm.billingName.trim()) {
    setToast({ message: "请输入持卡人姓名", type: "error" });
    return;
  }

  // 中国地址特殊验证
  if (addressForm.billingCountry === "China") {
    if (!addressForm.billingPostalCode.trim()) {
      setToast({ message: "请输入邮政编码", type: "error" });
      return;
    }
    if (!addressForm.billingLocality.trim()) {
      setToast({ message: "请输入城市", type: "error" });
      return;
    }
    if (!addressForm.billingDependentLocality.trim()) {
      setToast({ message: "请输入区县", type: "error" });
      return;
    }
  }

  if (!addressForm.billingAddressLine1.trim()) {
    setToast({ message: "请输入详细地址", type: "error" });
    return;
  }

  await addCardWithAddress(addressForm);
};
```

### 6.5 核心算法实现（TypeScript）

**卡号生成器类 (`src/utils/cardGenerator.ts`)：**

```typescript
export class CardGenerator {
  private currentYear: number;

  constructor() {
    this.currentYear = new Date().getFullYear();
  }

  /**
   * Luhn 校验算法 - 验证卡号有效性
   */
  static luhnChecksum(cardNumber: string): number {
    const digits = cardNumber.replace(/\D/g, '').split('').map(Number);
    let total = 0;
    let isEven = true;

    // 从右到左处理
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = digits[i];
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      total += digit;
      isEven = !isEven;
    }

    return (10 - (total % 10)) % 10;
  }

  /**
   * 验证卡号是否通过 Luhn 校验
   */
  static isValidLuhn(cardNumber: string): boolean {
    const digits = cardNumber.replace(/\D/g, '').split('').map(Number);
    let total = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = digits[i];
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      total += digit;
      isEven = !isEven;
    }

    return total % 10 === 0;
  }

  /**
   * 根据模式生成卡号
   */
  generateCardByPattern(pattern: string): GeneratedCard {
    const parts = this.parseInputPattern(pattern);
    let cardNumber = '';
    let month = '';
    let year = '';
    let cvv = '';

    if (parts.length === 1) {
      const inputPart = parts[0];

      // BIN Code Mode (6位银行识别码)
      if (/^\d{6}$/.test(inputPart)) {
        cardNumber = inputPart;
        for (let i = 0; i < 9; i++) {
          cardNumber += this.randomDigit();
        }
        cardNumber += CardGenerator.luhnChecksum(cardNumber).toString();
      }
      // X模式: 4342xxxxxxxx
      else if (/x/i.test(inputPart)) {
        cardNumber = inputPart.replace(/[xX]/g, () => this.randomDigit());
        if (cardNumber.length === 15) {
          cardNumber += CardGenerator.luhnChecksum(cardNumber).toString();
        } else if (cardNumber.length === 16) {
          cardNumber = cardNumber.slice(0, -1) + 
                       CardGenerator.luhnChecksum(cardNumber.slice(0, -1)).toString();
        }
      }
      // *模式和#模式
      else if (inputPart.includes('*') || inputPart.includes('#')) {
        cardNumber = inputPart
          .replace(/\*/g, () => this.randomDigit())
          .replace(/#/g, () => this.randomDigit());
        while (cardNumber.length < 15) {
          cardNumber += this.randomDigit();
        }
        cardNumber += CardGenerator.luhnChecksum(cardNumber).toString();
      }
      // 纯数字 - 不完整卡号
      else if (/^\d+$/.test(inputPart)) {
        cardNumber = inputPart;
        while (cardNumber.length < 15) {
          cardNumber += this.randomDigit();
        }
        cardNumber += CardGenerator.luhnChecksum(cardNumber).toString();
      }

      // 随机生成月、年、CVV
      month = this.randomMonth();
      year = this.randomYear().slice(-2);
      cvv = this.randomCvv();
    } 
    // 多部分模式处理（卡号|月|年|CVV）
    else if (parts.length >= 2) {
      // ... 处理完整格式输入
    }

    return { cardNumber, month, year, cvv };
  }

  /**
   * 批量生成卡号
   */
  generateCards(pattern: string, count: number = 10): GeneratedCard[] {
    if (!pattern.trim()) {
      throw new Error('Pattern cannot be empty!');
    }

    const results: GeneratedCard[] = [];
    let attempts = 0;
    const maxAttempts = count * 10;

    while (results.length < count && attempts < maxAttempts) {
      attempts++;
      const card = this.generateCardByPattern(pattern);

      // Luhn 校验
      if (CardGenerator.isValidLuhn(card.cardNumber)) {
        results.push(card);
      }
    }

    return results;
  }
}
```

**支持的输入模式示例：**

| 模式类型 | 输入示例 | 说明 |
|---------|---------|------|
| BIN码模式 | `434256` | 6位银行识别码，自动补全16位 |
| X模式 | `4342xxxxxxxx` | x/X 表示随机数字 |
| 星号模式 | `4342****` | * 表示随机数字 |
| 井号模式 | `4342####` | # 表示随机数字 |
| 完整模式 | `434256\|12\|25\|123` | 卡号\|月\|年\|CVV |
| 智能模式 | `434256\|mm\|yy\|cvv` | 使用关键字自动生成 |
| 随机模式 | `434256\|rnd\|rnd\|rnd` | 使用rnd关键字随机 |
| MMYY模式 | `434256\|1225` | 自动识别月年格式 |

**模式分隔符支持：**
- 竖线 (`|`)、斜杠 (`/`)、短横线 (`-`)、冒号 (`:`)、逗号 (`,`)、空格

### 6.6 地址配置集成

```typescript
// 中国省份选择器
{addressForm.billingCountry === "China" && (
  <div className="sm:col-span-2">
    <label className="block text-sm font-medium text-gray-700">
      省份/行政区 *
    </label>
    <select
      value={addressForm.billingAdministrativeArea}
      onChange={(e) => setAddressForm({
        ...addressForm,
        billingAdministrativeArea: e.target.value,
      })}
      className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
    >
      <option value="">请选择省份</option>
      {CHINA_PROVINCES.map((province) => (
        <option key={province.value} value={province.value}>
          {province.label}
        </option>
      ))}
    </select>
  </div>
)}
```

### 6.7 用户体验设计

**简洁高效的流程设计：**

1. **模式输入**: 支持多种卡号生成模式，灵活方便
2. **实时检测**: 输入时自动检测并提示模式类型
3. **批量生成**: 支持一次生成1-100张虚拟卡
4. **卡片预览**: 网格布局展示所有生成的卡片
5. **点击选择**: 点击卡片查看详细信息和操作
6. **一键复制**: 支持快速复制卡片信息到剪贴板
7. **智能集成**: 自动检测现有地址配置，避免重复输入
8. **验证完善**: 所有卡号通过 Luhn 校验确保有效性

### 6.8 模块特点总结

1. **纯前端实现**: 无需后端API调用，即时生成，性能优越
2. **算法完整**: 完整实现 Luhn 校验算法，确保卡号有效性
3. **模式丰富**: 支持6种以上的输入模式，灵活强大
4. **批量支持**: 支持批量生成，提高使用效率
5. **集成紧密**: 与银行卡配置系统无缝集成
6. **用户友好**: 提供清晰的状态反馈和错误处理
7. **扩展性好**: 支持多种卡类型识别和地址格式
8. **安全可靠**: 所有数据在本地生成，无网络请求

---

## 总结

Auto-Cursor 项目展现了现代桌面应用开发的最佳实践，通过六大功能模块的协同工作，提供了完整的 Cursor 编辑器管理解决方案：

### 技术亮点

1. **混合架构设计**: Tauri + React + Python 三重技术栈完美融合
2. **实时通信机制**: 基于事件的前后端协作
3. **自动化引擎**: Python 驱动的复杂业务流程自动化
4. **数据持久化**: SQLite + JSON 配置的混合存储方案
5. **安全设计理念**: 多层防护和数据加密

### 应用价值

该项目不仅仅是一个 Cursor 管理工具，更是现代桌面应用架构设计的典型案例，为同类项目提供了宝贵的设计参考和技术实现方案。通过 Web 技术的灵活性、原生应用的性能和脚本语言的便利性的完美结合，实现了从简单到复杂的全方位功能覆盖。
