# Provider / Model v2 手工测试与数据心智说明

> **用途**：为 `feat/v2/...` 等分支提供**可执行**的回归清单，并与 v1（`main`）行为做「现象级」对照。  
> **范围**：`ProviderList` / `ProviderSetting`、OAuth 与特例 Provider、**模型 CRUD 与拉取列表**、健康检查。  
> **关联**：与 `docs/provider-settings-v2-refactor-plan.md` 互补；本文侧重**怎么测、以什么数据语义验收**。

---

## 1. 文档怎么读

| 列 | 含义 |
|----|------|
| **深测** | 该类必须完整做一遍，覆盖关键数据路径。 |
| **冒烟** | 同类型再选一个 Provider，只做标明的最少步骤。 |
| **通过** | 无未捕获异常；**验收标准**列全部满足。 |

**与 main 对照**：不逐文件 diff。在同一 Provider 上，用**同一组操作**在 `main` 与当前分支各做一遍，对比**能否保存、能否连、重启是否还在、列表/聊天是否一致**。

---

## 2. 核心数据心智（测前必读）

### 2.1 Model：三种「id」不要混

| 概念 | 含义 | 典型出现位置 |
|------|------|----------------|
| **`CreateModelDto.modelId`** | 调厂商 API 时用的模型名字符串 | `POST /models`、健康检查、聊天请求体里的 `model` |
| **`Model.apiModelId`** | 与上通常一致；有则优选用 | Runtime `Model` |
| **`Model.id`（`UniqueModelId`）** | `providerId::modelId`，全局唯一切片键 | 列表行、`DELETE/PATCH` 路径、Select 选中等 |

**已统一的 UI 约定**（与 `ManageModelsPopup` 中 `toCreateModelDto` 一致）：

- 表单里「模型 ID」= **`model.apiModelId ?? parseUniqueModelId(model.id).modelId`**，**不要**把 `Model.id` 整串（含 `::`）当作 API 模型名展示或提交。
- 实现参考：`ModelList/NewApiAddModelPopup.tsx`（预填）、`EditModelPopup/ModelEditContent.tsx`（只读展示与复制）。

### 2.2 Provider：Runtime 与 DTO

- 列表/详情常见为 **Runtime**（如 API key 值脱敏）；**完整凭据**在设置页通过 **`GET /providers/:id/auth-config`** 等，与聊天热路径分离。
- **`authType`** 由 `authConfig.type` 派生；Vertex / Azure / Bedrock 的判别以 **`authType`（`iam-gcp` / `iam-azure` / `iam-aws`）** 为准，与 v1 仅靠 `type`/settings 的混法不同。

### 2.3 `POST /models` 传输形状

- 协议为 **`CreateModelDto[]`（数组）**；`useModelMutations().createModel(dto)` 在内部包一层 **`[dto]`**。

---

## 3. 等价类 A — 普通 API Key + Host

### 3.1 深测（建议：`openai` 或任一 OpenAI 兼容）

1. 设置中选中该 Provider：可见 **API Key**、**API Host**（或 Host 选择器下主 URL）。
2. 修改 **Host** → **失焦** 触发保存。  
3. 修改 **Key**（可含英文逗号多 key）。  
4. 停止输入后 **至少等待 200ms**（Key 写库为 **150ms 防抖**）。  
5. 点击 **检查 API** → 在模型选择里选**非 rerank** 聊天模型 → 等成功/失败提示。  
6. **完全退出应用再打开**，再进入同一 Provider，Host/Key 行为与关前一致（Key 可能脱敏，以能检查或能发聊为准）。

**与 main**：同样六步，对比现象。

### 3.2 冒烟

另选一个同类 Provider，仅：**改一次 Key → 等 200ms → 切走再回来** 不丢即可。

---

## 4. 等价类 B — OAuth 六家（最终仍是 API Key）

- **实现**：`ProviderOAuth` 用 `hasApiKeys`；成功走 `addApiKey(key,'OAuth')` 等，**不**再依赖 Redux 里逗号串 `apiKey`。
- **深测 1（popup 式，如 `silicon`）**：未登录 → 点 OAuth → 完成后出现 **充值/账单**（`hasApiKeys` 为真）。  
- **深测 2（deep link 式，如 `ppio`）**：同上，重点看回调后状态。  
- **冒烟**：`302ai` / `aihubmix` / `aionly` 中任选 0～1 个。  
- **`tokenflux`**：无回调自动写 key，需手动粘贴 key 后按 **类 A** 验保存。

---

## 5. 等价类 C — CherryIN / DMXAPI（多 URL 域名一起变）

**代码**：`replaceEndpointConfigDomain` + `updateProvider({ endpointConfigs })`（见 `CherryINSettings.tsx`、`DMXAPISettings.tsx`）。

- **CherryIN**：在域名下拉里**切换**两次；确认**所有** `endpointConfigs` 中 URL 的 **hostname** 随域名切换，而非只改一个展示字段。  
- **DMXAPI**：在平台 Radio 间切换，同样确认**多端点**域名一致。  

**与 main**：比「切域名后各协议是否仍指向同一逻辑站点」，不比 Redux 字段名。

---

## 6. 等价类 D — Vertex / Bedrock

- **Vertex**：`useProviderAuthConfig` 读；字段 **onBlur** 写整包 `iam-gcp`。**冷启动回显**必测。  
- **Bedrock**：Radio **IAM / API Key**；IAM 下 **onBlur** 写 `iam-aws`。注意当前 `AwsBedrockSettings` 以 IAM + Region 为主，若 **API Key 模式无输入区**，记产品/缺陷与 main 能力差异。  

---

## 7. 等价类 E — Ollama vs GPUStack

- v1 中 `NOT_SUPPORT_API_KEY_PROVIDERS` 含 `ollama`、`lmstudio` 等，**不含** `gpustack`（以 `main` 的 `utils/provider` 或等价为准）。  
- **Ollama**：Key 留空，做检查 API 或发一条聊，**不应**仅因无 key 非法失败。  
- **GPUStack**：同样空 Key 测一次，**与 v1 或预期**比较是否更严；不一致记缺陷。  

---

## 8. 等价类 F — GitHub Copilot

- 通用 Key 行对 `copilot` 为 **隐藏/禁用**（`ProviderSetting` 中 `noAPIKeyInputProviders`）。  
- 走 **Device Code** 全流程；登录后看 **`provider.settings.isAuthed`、用户名展示** 与 **v2 写库**。  
- 若仍处于 **Phase 5B 前** aiCore 读旧 slice，需按代码是否仍 **双写 `useCopilot()`**，验收「设置与 Redux 展示一致」。见 `GithubCopilotSettings.tsx` 注释。  

---

## 9. 模型管理：拉取、添加、编辑、健康检查

### 9.1 「获取模型列表」里谁说了算（*ManageModelsPopup*）

实现见 `ModelList/ManageModelsPopup.tsx` 中 `loadModels` 与注释：

1. 用 `fetchModels` + `rotated-key` 得到 **远程列表**（身份与条数上的**主来源**）。  
2. 将过滤后的 id/name 等 `POST` 到 **`/providers/:id/registry-models`**，得到 **Registry 增强**（能力、定价、`contextWindow` 等**补充字段**）。  
3. 合并时 **以远程每条为基底**，再 overlay Registry；**避免**只信 Registry 丢远程独有 id。  
4. **另有一路** `useProviderRegistryModels` 的 **catalog**，与 **`listModels`（拉取+增强后）**、**已有 `existingModels`** 做 `uniqBy([...catalog, ...list, ...existing], 'id')`。**同 id 先出现者保留**（当前顺序 catalog 在前），与「单条拉取以远程为准」是不同层：一个管**全表合并展示**，一个管**单条丰富**。

**测试时**：切域名/换 key 后拉列表，看 **条数与 id 是否以远端为准、元数据是否更全**；若同 id 展示与预期不符，先对一下 **uniqBy 顺序** 是否该问题。

### 9.2 手工用例（建议编号写进你们 TMS）

| 编号 | 内容 | 步骤摘要 | 通过标准 |
|------|------|----------|----------|
| **H1** | 列表加载 | 进任一已配置 Provider 模型区 | 不长期转圈，有数据或空态 |
| **H1b** | 持久化 | 关应用重开同 Provider | 模型列表与关前一致 |
| **H2** | 手动添加 | 点 **+** → `AddModelPopup` 填**新** id 提交；再重复同 id | 第二次报已存在，库中无重复 |
| **H3** | 逗号批量 | id 填 `a,b` 提交 | 两个都出现或按产品规则报错（记录实际） |
| **H4** | 拉取/管理 | 点 **获取模型列表** → 勾选未添加 → 添加；再取消/删除 | 与主 `ModelList` 一致，重启后仍在 |
| **H5** | new-api 弹窗 | `isNewApiProvider` 的 Provider 点 **+** 应出 **`NewApiAddModelPopup`** | 能成功添加至少一条（含 endpoint 若必填） |
| **H6** | 编辑/删除 | 编辑名称分组保存；单条删；有则 **整组删** | `PATCH/DELETE` 后列表与重启一致 |
| **H7** | 健康检查 | 有非 rerank 模型 → 点批量健康检查，多 key 时看弹窗 key 列表 | 结束有汇总 Toast，无未处理崩溃 |
| **H8** | OVMS | 在支持平台选 `ovms` | **+** 为下载类弹窗，非普通 `AddModelPopup` |

### 9.3 与「API 模型 id」相关的验收（已代码收紧）

- **NewApi 单条补充**：从管理列表打开 `NewApiAddModelPopup` 时，「模型 ID」预填为 **API `modelId`**，非 `UniqueModelId`。  
- **编辑模型弹窗**：只读「模型 ID」与**复制**均为 **同一条 API `modelId`**（见 `ModelEditContent` 中 `apiModelId`）。

---

## 10. 横切与顺序建议

1. 先做 **BLOCKER 类**（若分支含）：Anthropic 选项与 `authConfig`、**`GET auth-config`、**`apiKeys` 全量 PATCH 与丢 key 风险**（以当前 `ProviderService.update` 实现为准，若未做合并则**禁止**用「无 key 的残缺列表」整表 PATCH）。  
2. 再跑 **3.1 深测 + H2/H4/H7** 串在同 one Provider 上，减少切页。  
3. 特例 **B → C → D → F → E** 按环境投入时间。  

---

## 11. 缺陷分级（建议）

| 级别 | 示例 |
|------|------|
| **P0** | 改 key 并防抖后**仍丢**；OAuth 成功但 `hasApiKeys` 仍假；Vertex/Bedrock **重启后凭据全丢**；CherryIN 切域名后**部分 URL 仍旧 host**；`PATCH apiKeys` **整表覆写**导致**未提交的 key 被清空**（若实现无合并）。 |
| **P1** | `checkApi` 必现崩溃；Bedrock API Key 模式与 main 能力不对等且属回归。 |
| **P2** | 仅文案/Toast 差异。 |

---

## 12. 自动化

- 发布前仓库约定：`pnpm lint`、`pnpm test`、`pnpm build:check`（以 `package.json` / `CLAUDE.md` 为准）。  
- 本清单为**手工**；若上 E2E，建议只锁 **1 条**「设置中改 Host + 断言落库/刷新」以覆盖主路径，勿为 39 个 Provider 各写一条。

---

## 13. 变更记录

| 日期 | 说明 |
|------|------|
| （填写） | 首版：等价类、模型、ManageModels 远程+Registry、Model id 心智与测试矩阵。 |

若本分支合入后行为有变，请更新 **§2、§9.1、§9.3** 与 **变更记录**。
