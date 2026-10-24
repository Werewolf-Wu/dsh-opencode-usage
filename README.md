# OpenCode Go / Command Code 用量

DSH Web 插件：在消息输入框下方、上下文用量指示器的右侧显示一个小图标。打开弹层后，可切换查看 OpenCode Go 或 Command Code；默认选择 OpenCode，不自动跟随当前模型，刷新页面后恢复默认选择。

## 数据来源

- Host 端通过 `ctx.credentials` 读取与 `opencode-go` LLM 路由相同的 `OPENCODE_GO_API_KEY`，请求 `GET https://opencode.ai/zen/go/v1/usage`，只把 `rolling`、`weekly`、`monthly` 的 `status`、`percent`、`resetsAt` 返回浏览器。
- 浏览器请求同源路由 `GET /opencode-go/usage`，Host 通过 `connection` 检查 DSH 会话及 Host/Origin 后才读取密钥并查询上游。
- 获取失败时弹层显示错误和“重试”；请求成功但没有可显示数据时显示“暂无用量数据”。

Command Code 使用独立凭据 `COMMANDCODE_API_KEY`，由 Host 从 DSH 凭据库读取。只用其中一个服务时，仅需配置该服务的凭据。

```yaml
version: 1
refs:
  COMMANDCODE_API_KEY: <你的 API key>
```

浏览器通过同源路由 `GET /command-code/usage` 查询，同样经过 DSH 会话和 Host/Origin 检查。Host 使用 Bearer 认证，按官方 CLI 相同的接口与作用域查询 API Key 可见的接口：

- `GET /alpha/billing/credits`：五小时 / 每周窗口与各项余额
- `GET /alpha/billing/subscriptions`：`planId` 与订阅周期
- `GET /alpha/whoami`：账号名（仅显示用）
- `GET /alpha/usage/summary?since=<订阅周期开始>`：本周期 TOKEN 总数与请求数

只返回用量摘要，密钥、用户 ID、邮箱和订阅 ID 不进入浏览器。

## 显示

- 五小时 / 每周：已用比例、已用 / 上限 credits、重置倒计时。上限是 credit 额度（GOAT 为 $14 / 5 小时、$35 / 周），窗口从首次请求开始滚动，`resetAt` 为 Unix 毫秒。
- 每月：弹层标注为「每月用量（估算）」，按 `套餐月度额度 − 月度余额` 推算，不来自上游窗口。额度取自官方 CLI（`command-code` 1.88 的 `getPlanInfo`），只匹配套餐表中的完整 planId：`individual-go` / `individual-go-v1` 10、`individual-goat` 70、`individual-pro` 30、`individual-pro-v1` 80、`individual-max` 150、`individual-ultra` 300、`teams-pro` 40；`individual-provider` 按量计费，只显示套餐名和真实余额，不显示月度估算。未知 `planId` 同样不显示该行。Command Code 文档对 GOAT 额度有 70 和 80 两种写法，这一行与真实余额分开显示，余额不受影响。余额高于表内额度时（例如有额外赠送）不显示该行。
- 账号（`@userName · 套餐`）、订阅周期（API）起止、本期 TOKEN 总数与请求数。
- 仅在打开弹层、切换服务或重试时查询，不后台轮询；切换或关闭会取消浏览器端的旧请求。

### 与 Studio 控制台的区别

Studio 的 Usage 页只使用登录 Cookie 的 `/internal/*`（`/internal/billing/credits`、`/internal/billing/subscriptions?withPending=true`、`/internal/usage/summary`），API Key 访问这些接口会返回 401。本插件与官方 CLI 一样使用 `/alpha/*`。因此如果控制台登录的是另一个账号，或账期与本插件显示的“订阅周期（API）”不同，两边数值本来就不会一致；请先核对控制台账号与本插件的账号行。控制台的月度百分比还参考 `monthlyCreditsGranted`，该字段不在 API Key 接口中返回，本插件的月度百分比是推算值。

## 文件

| 文件 | 作用 |
| --- | --- |
| `index.js` | Host 半：注册两条用量路由并查询上游 |
| `client.js` | Client 半：注册 `conversation.composer.dock` 图标与弹层 |
| `cordis.patch.yml` | 向 profile 插入 `opencode-go-usage` 行 |
| `locale/*.json` | 插件列表中的标题与描述 |
| `icon.svg` | 插件图标 |

## 安装

已通过 `link:` 方式装入 `desktop` profile（`package.json` 的 `dsh.profile.bundles` 含 `@local/dsh-opencode-usage`）。

在其他 profile 中安装时，用 Plugins 页面的 **添加插件 → 安装第三方插件** 填入本目录绝对路径；对 CLI 管理的 profile 也可以：

```sh
dsh plugin --profile <name> add "link:/path/to/dsh-opencode-usage"
```

profile 重算后 DSH 会热加载 Host 与 Client 两半。

## 从 Release 安装

仓库打 `v<version>` 标签后，`.github/workflows/release.yml` 会检查语法、执行 `npm pack`，把 tarball 挂到 GitHub Release。DSH 支持用 tarball 地址安装，所以不需要发布到 npm：

```sh
dsh plugin --profile web add https://github.com/Werewolf-Wu/dsh-opencode-usage/releases/download/v1.1.0/local-dsh-opencode-usage-1.1.0.tgz
```

也可以在 Plugins 页面的“安装第三方插件”里填同一个地址。标签必须与 `package.json` 的 `version` 一致，否则 workflow 失败。升级时用新版本的地址再执行一次 `add`；回滚就安装旧版本地址。不打标签时，可在 Actions 里手动运行该 workflow，从运行记录下载 `plugin-tarball` 构件。

支持部署在 `/dsh/` 等子路径下，用量请求会沿用该路径前缀。使用反向代理时，需按 DSH 的部署要求配置前缀剥除。

## 验证

先打开 DSH Web GUI 并完成登录，在该页面的开发者工具控制台中执行：

```js
const response = await fetch(new URL('opencode-go/usage', document.baseURI), { cache: 'no-store' })
console.log(response.status, await response.json())
```

查询 Command Code 时把 `opencode-go/usage` 换成 `command-code/usage`。返回 `200` 和 `{"usage":{...}}` 表示 Host 已成功取得并校验数据；Command Code 的成功响应还包含 `monthly`（`estimated: true` 表示推算值）、`billing.periodStartsAt` / `periodEndsAt`、`plan`、`account` 与 `totals`。`401 / unauthorized` 表示 DSH 会话未通过认证，`403 / forbidden` 表示 Host/Origin 被拒绝，`401 / missing-key` 表示尚未配置所选服务的凭据；`502 / upstream` 中的 `status: 401` 或 `403` 表示上游拒绝了该 API key。不携带 DSH 认证信息的裸 `curl` 不能用于验证查询成功。
