# 面试准备：云安全 / DevSecOps 工程师

> 配套 JD：[职位描述-云安全DevSecOps工程师.md](./职位描述-云安全DevSecOps工程师.md)

## 怎么用这份文档

| 阶段 | 做什么 |
|---|---|
| 面试前 3~5 天 | 通读一遍，标记「不熟」的条目，按「落地方案」补 |
| 面试前 1 天 | 只看每节的**答题框架**和**一句话结论** |
| 面试中 | 按 `现状问题 → 方案 → 落地步骤 → 度量结果` 四段式回答 |

**核心原则**：每个问题都要答到「我会怎么落地」，而不是「这个概念是什么」。面试官考的是能不能干活。

---

## 零、先读懂这个岗位

JD 里有一句话是整个岗位的定位，很多人会略过：

> **与运维团队形成职责分离**，保障公司技术资产、业务数据和生产环境安全。

这句话透露三件事：

| 信号 | 含义 | 面试时怎么用 |
|---|---|---|
| 职责分离（SoD） | 你不是运维，你是**制定规则 + 审计**的人 | 强调「我设计策略、做护栏、审计执行」，而不是「我去改服务器」 |
| 技术资产 / 业务数据 | 公司有**支付**相关业务（第七节提到支付 Key） | 主动提合规：等保、PCI DSS 的意识 |
| 安全**体系**建设 | 不是救火，是从 0 建体系 | 准备「分阶段路线图」类回答，别只讲单点技术 |

**一句话定位自己**：
> 我负责把安全能力做成平台和护栏，让研发和运维在默认安全的轨道上跑，而不是靠人肉检查。

---

## 一、云平台安全（AWS 方向）

### Q1：如何设计一套 IAM 权限体系，落地最小权限原则？

**答题框架（四层）**

| 层级 | 手段 | 作用 |
|---|---|---|
| 组织层 | AWS Organizations + SCP | 全局护栏，连 root 都越不过 |
| 账号层 | 多账号隔离 | 爆炸半径控制 |
| 身份层 | IAM Identity Center（SSO） | 人不持有长期凭据 |
| 权限层 | Permissions Boundary + 最小权限策略 | 具体能干什么 |

**账号结构（可直接画给面试官）**

```
Root（管理账号，不跑业务）
├── Security OU
│   ├── security-tooling    GuardDuty / Security Hub / Config 聚合
│   └── log-archive         CloudTrail / VPC Flow Logs 归档（只进不出）
├── Infrastructure OU
│   ├── shared-services     跳板机、CI Runner、私有 Registry
│   └── network             Transit Gateway、出口统一管控
└── Workload OU
    ├── prod
    ├── staging
    └── dev
```

**SCP 护栏示例（贴出来很加分）**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyDisableSecurityServices",
      "Effect": "Deny",
      "Action": [
        "cloudtrail:StopLogging",
        "cloudtrail:DeleteTrail",
        "guardduty:DeleteDetector",
        "config:DeleteConfigurationRecorder"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DenyRootUser",
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": { "StringLike": { "aws:PrincipalArn": "arn:aws:iam::*:root" } }
    },
    {
      "Sid": "RegionLock",
      "Effect": "Deny",
      "NotAction": ["iam:*", "organizations:*", "route53:*", "cloudfront:*", "support:*"],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": { "aws:RequestedRegion": ["ap-east-1", "us-east-1"] }
      }
    }
  ]
}
```

**「最小权限」的落地方法（这是区分水平的关键）**

不要说「按需分配」，要说**收敛流程**：

1. **先宽后收**：新服务上线给一个宽松策略 + 标记 `review-by` 日期
2. **用数据收敛**，不靠拍脑袋：
   ```bash
   # 基于 CloudTrail 实际调用记录，自动生成最小权限策略
   aws accessanalyzer start-policy-generation \
     --policy-generation-details '{"principalArn":"arn:aws:iam::123456789012:role/app-role"}' \
     --cloud-trail-details file://trail-details.json
   ```
3. **IAM Access Analyzer** 持续发现：未使用的权限、可被外部访问的资源
4. **季度 recertification**：权限所有者签字确认，不确认就回收

**机器身份绝不发 AccessKey**

| 场景 | 正确做法 |
|---|---|
| EC2 | Instance Profile（Role） |
| EKS Pod | IRSA / EKS Pod Identity |
| Lambda | 执行角色 |
| GitLab CI | **OIDC 联合**（见第六节），不是存 AK 到变量 |
| 本地开发 | SSO 临时凭据 `aws sso login` |

**加分回答**：
> 我会先做一次「长期 AccessKey 清零」专项：用 Credential Report 找出所有 AK，按最后使用时间排序，逐个替换成 Role 或 OIDC，最后用 SCP 禁止 `iam:CreateAccessKey`。

---

### Q2：VPC、安全组、网络访问策略怎么管？

**三层子网结构**

| 子网 | 放什么 | 出网方式 | 入网 |
|---|---|---|---|
| Public | ALB / NAT Gateway | IGW | 仅 443 |
| Private | 应用服务器、EKS Node | NAT Gateway | 仅来自 ALB 的 SG |
| Data | RDS / ElastiCache / Kafka | **无出网** | 仅来自 Private 的 SG |

**安全组的两条铁律**

```hcl
# ❌ 错误：用 CIDR，机器扩容就要改规则，而且粒度太粗
ingress { from_port = 3306, cidr_blocks = ["10.0.0.0/16"] }

# ✅ 正确：引用安全组，语义是「谁」而不是「哪个网段」
resource "aws_security_group_rule" "db_from_app" {
  type                     = "ingress"
  from_port                = 3306
  to_port                  = 3306
  protocol                 = "tcp"
  security_group_id        = aws_security_group.db.id
  source_security_group_id = aws_security_group.app.id   # ← 关键
}
```

1. **入站引用 SG，不用 CIDR**（除非是固定的办公出口 IP）
2. **默认拒绝**，SG 不写 `0.0.0.0/0` 入站（443 到 ALB 除外）

**VPC Endpoint —— 省钱又安全**

S3、ECR、Secrets Manager、KMS 走 VPC Endpoint，流量不出 AWS 骨干网：

```hcl
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.ap-east-1.s3"
  vpc_endpoint_type = "Gateway"
  policy            = data.aws_iam_policy_document.s3_endpoint.json  # 可以限制只能访问本公司桶
}
```

**面试官可能追问：如何防止有人开了 0.0.0.0/0 的安全组？**

三道防线，缺一不可：

| 防线 | 手段 | 时机 |
|---|---|---|
| 事前 | IaC 扫描（tfsec / checkov）在 MR 阶段阻断 | 代码提交时 |
| 事中 | SCP 禁止特定端口对全网开放 | API 调用时 |
| 事后 | AWS Config Rule `restricted-ssh` + 自动修复 Lambda | 发生后 5 分钟内 |

---

### Q3：CloudTrail / CloudWatch 安全审计怎么建？

**日志不能放在被审计的账号里** —— 这是最关键的设计点。

```
prod 账号  ─┐
staging   ─┼→ 组织级 CloudTrail → log-archive 账号的 S3
dev       ─┘                      ├── Object Lock（合规模式，不可删）
                                  ├── KMS 加密
                                  └── 生命周期：90天 → Glacier，保留 1 年
```

**为什么**：攻击者拿到 prod 权限后第一件事就是删日志。日志放在独立账号 + Object Lock，prod 的任何权限都动不了它。

**必须配的实时告警**

| 事件 | 严重级 | 检测方式 |
|---|---|---|
| root 账号登录 | P0 | EventBridge → SNS → 电话 |
| CloudTrail 被停用 / 删除 | P0 | 同上 |
| IAM 策略被附加 `AdministratorAccess` | P0 | 同上 |
| 安全组新增 0.0.0.0/0 | P1 | Config Rule |
| KMS Key 被安排删除 | P1 | EventBridge |
| Console 登录失败 >5 次 | P2 | CloudWatch Metric Filter |

**EventBridge 规则示例**

```json
{
  "source": ["aws.signin"],
  "detail-type": ["AWS Console Sign In via CloudTrail"],
  "detail": {
    "userIdentity": { "type": ["Root"] }
  }
}
```

**查询层**：CloudTrail Lake 或 Athena。准备一条能背下来的 SQL：

```sql
-- 找出过去 7 天内所有的 IAM 权限变更
SELECT eventtime, useridentity.arn, eventname, requestparameters
FROM cloudtrail_logs
WHERE eventsource = 'iam.amazonaws.com'
  AND eventname LIKE 'Put%' OR eventname LIKE 'Attach%' OR eventname LIKE 'Create%'
  AND from_iso8601_timestamp(eventtime) > current_timestamp - interval '7' day
ORDER BY eventtime DESC;
```

---

### Q4：云资源安全基线怎么推？

**基线 = 一组可自动检测的规则 + 阻断机制**，不是一份 Word 文档。

| 层 | 工具 | 做什么 |
|---|---|---|
| 标准 | CIS AWS Benchmark / AWS FSBP | 规则来源，不自己编 |
| 检测 | Security Hub + AWS Config | 持续评估，出分数 |
| 威胁 | GuardDuty | 异常行为（挖矿、凭据外泄、端口扫描） |
| 事前 | Checkov / tfsec 在 CI | **在资源创建前拦截** |
| 修复 | Config 自动修复 / SSM Automation | 高频低危问题自动改 |

**推行节奏（面试时讲这个比讲工具更有说服力）**

1. **观察期 2 周**：只报不拦，拿到基线分数和 TOP 10 问题
2. **公示 + 白名单**：给业务团队看清单，允许申请例外（有期限、有负责人）
3. **新资源先拦**：CI 上阻断，存量给 30~90 天整改期
4. **存量清零**：按严重级分批推动，进度上周报
5. **指标固化**：Security Hub 分数纳入部门 KPI

**一句话结论**：
> 基线推行失败通常不是技术问题，是没有给业务留缓冲和例外通道。我会用「新的先拦住，老的给期限」的方式，避免一刀切引发对抗。

---

## 二、基础设施安全

### Q5：Linux 服务器安全加固具体做哪些？

**不要背清单，要讲分层**

| 层 | 措施 | 验证方式 |
|---|---|---|
| 最小化 | 不装图形界面、移除不用的服务包 | `systemctl list-unit-files --state=enabled` |
| 账号 | 禁用直接 root 登录、禁用空密码、锁定系统账号 | `awk -F: '($2==""){print $1}' /etc/shadow` |
| 访问 | SSH 密钥/证书、堡垒机收口 | 见 Q6 |
| 提权 | sudo 精确到命令、全量记录 | `/etc/sudoers.d/` |
| 审计 | auditd 监控关键文件和系统调用 | `auditctl -l` |
| 内核 | sysctl 网络参数、禁用不用的模块 | `sysctl -a` |
| 补丁 | 统一补丁窗口 + 自动化 | SSM Patch Manager |

**关键 sshd_config（能默写出来很加分）**

```bash
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no          # 只允许密钥
PubkeyAuthentication yes
PermitEmptyPasswords no
MaxAuthTries 3
ClientAliveInterval 300            # 5 分钟无操作
ClientAliveCountMax 2              # 断开
AllowGroups ssh-users              # 白名单组，不是所有用户
X11Forwarding no
AllowTcpForwarding no              # 防止把跳板机当隧道
LogLevel VERBOSE                   # 记录密钥指纹，能追溯是哪把钥匙
```

**auditd 关键规则**

```bash
# /etc/audit/rules.d/hardening.rules
-w /etc/passwd -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/sudoers -p wa -k scope
-w /etc/sudoers.d/ -p wa -k scope
-w /var/log/sudo.log -p wa -k actions
-a always,exit -F arch=b64 -S execve -F euid=0 -k root_cmd   # 记录所有 root 执行的命令
```

**sudo 最小权限示例**

```bash
# ❌ 危险：等于给了 root
deploy ALL=(ALL) NOPASSWD: ALL

# ✅ 精确到命令 + 参数
deploy ALL=(root) NOPASSWD: /bin/systemctl restart myapp, /bin/systemctl status myapp
Defaults:deploy log_output              # 记录完整输出
Defaults:deploy !visiblepw
```

**落地顺序建议**：
> 先用 CIS Benchmark 扫一遍拿基线分（`openscap` 或 `Lynis`），按「高危 + 不影响业务」优先改，改完固化成镜像（Golden AMI）+ Ansible Playbook，新机器出厂即合规。

---

### Q6：SSH 安全管理和访问审计怎么做？

**演进三个阶段**，讲清楚你在哪一层：

| 阶段 | 方案 | 问题 |
|---|---|---|
| L1 | 每人一把密钥直连 | 密钥散落、离职无法回收、无审计 |
| L2 | 堡垒机 + 密钥 | 有审计，但密钥仍是长期凭据 |
| L3 | **短期证书 + 会话录制** | 证书 8 小时过期，离职自动失效 |

**L3 的落地（推荐答案）**

```
用户 → SSO（MFA）→ 证书签发服务 → 拿到 8h 有效的 SSH 证书
                                    ↓
                              堡垒机（会话录制）
                                    ↓
                              目标服务器（只信任 CA 公钥）
```

服务器侧只需一行配置，**不再管理 authorized_keys**：

```bash
# /etc/ssh/sshd_config
TrustedUserCAKeys /etc/ssh/ca.pub
AuthorizedPrincipalsFile /etc/ssh/principals/%u
```

可选工具：Teleport、HashiCorp Boundary、JumpServer、AWS SSM Session Manager。

**AWS 场景的最省力方案**：直接用 **SSM Session Manager**
- 服务器**不开 22 端口**、不需要公网 IP、不需要堡垒机
- 权限走 IAM，会话日志自动进 S3/CloudWatch
- 面试时可以说：「云上我倾向于直接取消 SSH 入站，用 SSM 接管，把网络攻击面降到 0」

**审计要能回答三个问题**：谁、什么时候、做了什么。会话录制 + auditd 的 `execve` 记录，两者缺一不可。

---

### Q7：Redis / MySQL / Kafka 中间件安全配置？

**通用四件套**：不暴露公网 → 强认证 → 传输加密 → 最小权限 → 审计日志

**Redis**

```bash
bind 10.0.2.10                    # 绝不 0.0.0.0
protected-mode yes
requirepass <32位随机>              # 或用 ACL
appendonly yes

# Redis 6+ 用 ACL，按业务拆账号
user app-order on >密码 ~order:* +@read +@write -@dangerous
user readonly  on >密码 ~*        +@read

# 禁用高危命令
rename-command FLUSHALL ""
rename-command CONFIG   ""
rename-command KEYS     ""        # KEYS 会阻塞，也是信息泄露入口
```

> **面试高频追问**：Redis 未授权访问怎么被利用？
> 答：攻击者连上后用 `CONFIG SET dir /root/.ssh` + `CONFIG SET dbfilename authorized_keys` 写入 SSH 公钥直接拿 shell。所以 `rename-command CONFIG ""` 不是可选项。

**MySQL**

```sql
-- 账号按用途拆分，禁止 % 通配
CREATE USER 'app_order'@'10.0.2.%' IDENTIFIED BY '...' REQUIRE SSL;
GRANT SELECT, INSERT, UPDATE ON orders.* TO 'app_order'@'10.0.2.%';
-- 绝不给：DROP / GRANT OPTION / FILE / SUPER

-- 只读账号给 BI / 排障用
CREATE USER 'readonly'@'10.0.3.%' IDENTIFIED BY '...' REQUIRE SSL;
GRANT SELECT ON orders.* TO 'readonly'@'10.0.3.%';
```

其他要点：删除匿名账号和 test 库、`local_infile=0`、开审计插件、RDS 开启加密和自动备份。

**Kafka**

| 项 | 配置 |
|---|---|
| 认证 | SASL/SCRAM-SHA-512（不用 PLAIN） |
| 传输 | TLS，`security.inter.broker.protocol=SASL_SSL` |
| 授权 | ACL 按 topic + consumer group 授权 |
| 关闭 | `allow.everyone.if.no.acl.found=false` |

```bash
kafka-acls --add --allow-principal User:app-order \
  --operation Read --operation Write --topic order-events
```

---

### Q8：漏洞扫描和风险整改流程？

**光扫不改等于没做。要讲闭环。**

| 环节 | 工具 | 频率 |
|---|---|---|
| 主机漏洞 | AWS Inspector / Nessus / OpenVAS | 每周 |
| 容器镜像 | Trivy / Grype | 每次构建 |
| 依赖组件 | Dependabot / OWASP Dependency-Check | 每日 |
| Web 应用 | ZAP / Burp | 每次大版本 |
| 配置合规 | Security Hub / Config | 持续 |

**整改 SLA（拿出这张表就赢一半）**

| 等级 | 判定 | 修复时限 | 未按时 |
|---|---|---|---|
| 紧急 | CVSS ≥ 9.0 **且**有公开 EXP **且**对外暴露 | 24 小时 | 升级到 CTO |
| 高 | CVSS 7.0~8.9 | 7 天 | 周报点名 |
| 中 | CVSS 4.0~6.9 | 30 天 | 月报统计 |
| 低 | CVSS < 4.0 | 下个迭代 | 跟踪即可 |

**关键点**：**CVSS 分数不等于实际风险**。要结合：是否对外暴露、是否有 EXP、是否在关键链路。一个内网不可达的 9.8 分漏洞，优先级低于一个对外暴露的 7.5 分。

**面试加分**：
> 我会建一个「漏洞台账」，字段包括：责任人、发现时间、SLA 到期时间、当前状态、例外说明。每周自动推送超期清单到对应团队负责人，而不是安全团队追着人跑。

---

## 三、网络安全体系建设

### Q9：企业远程接入（VPN）体系怎么设计？

**先讲传统 VPN 的三个问题**，再给方案，这样显得你有判断：

| 问题 | 说明 |
|---|---|
| 过度信任 | 连上 VPN 就进内网，横向移动无阻碍 |
| 粒度粗 | 按网段授权，做不到「只能访问某个应用」 |
| 设备不可控 | 个人电脑中毒 → 直通内网 |

**演进路线（分三步，可落地）**

```
第一步：先给现有 VPN 加锁
  └─ 强制 MFA（优先 FIDO2/WebAuthn，抗钓鱼）
  └─ 按部门拆分网段授权，不再全网可达
  └─ 接入日志集中 + 异常地理位置告警

第二步：关键应用先做 ZTNA
  └─ GitLab / 内部管理后台 / 数据库管理工具
  └─ 应用级代理，不给网络层访问权
  └─ 每次访问校验：身份 + 设备状态 + 上下文

第三步：收缩 VPN 范围
  └─ VPN 只保留必须走网络层的场景（如运维 SSH）
  └─ 其余全部迁移到 ZTNA
```

**Zero Trust 的三条核心原则**（面试官爱问定义）

1. **永不信任，始终验证** —— 内网不等于可信
2. **最小权限 + 按会话授权** —— 不是一次登录管一天
3. **假设已被攻破** —— 设计时就假定攻击者已在内网

**每次访问都要校验的四个维度**：

| 维度 | 检查什么 |
|---|---|
| 身份 | SSO + MFA 通过 |
| 设备 | 是否公司管控设备、磁盘加密、EDR 在线、补丁版本 |
| 上下文 | 地理位置、时间、IP 信誉 |
| 权限 | 该身份对该应用是否有授权 |

**工具选型**（有开源和云服务两条路）：
- 云服务：Cloudflare Access、AWS Verified Access、Zscaler
- 自建：Teleport、Pomerium、Tailscale + ACL

**一句话结论**：
> Zero Trust 不是买个产品就完成的，它是一个方向。我会从「MFA + 应用级代理保护高价值系统」开始，逐步把 VPN 的承载范围缩小，而不是一次性推翻重来。

---

### Q10：MFA 怎么落地？

| 方式 | 抗钓鱼 | 成本 | 适用 |
|---|---|---|---|
| 短信验证码 | ❌ 可被 SIM 劫持 | 低 | 不推荐 |
| TOTP（Google Authenticator） | ⚠️ 可被实时钓鱼 | 低 | 普通员工 |
| **FIDO2 / WebAuthn（硬件密钥）** | ✅ 绑定域名，钓不走 | 中 | **管理员、运维、财务必须** |
| 推送确认 | ⚠️ 有 MFA 疲劳攻击 | 中 | 需配合数字匹配 |

**分级策略**（体现你会做权衡）：

```
管理员 / 生产环境访问  → 强制 FIDO2 硬件密钥
研发 / 普通员工        → TOTP + 设备信任
只读 / 低敏感系统      → TOTP
```

**必须覆盖的入口**（少一个就是缺口）：AWS Console、VPN、GitLab、跳板机、邮箱、内部管理后台。

**面试追问：MFA 疲劳攻击怎么防？**
> 答：启用「数字匹配」（用户要输入屏幕上的数字，不是简单点同意）+ 限制推送频率 + 短时间多次失败触发告警并锁定。根本解法是换 FIDO2。

---

## 四、身份与权限管理

### Q11：RBAC 模型怎么设计？

**核心原则：角色对应「岗位」，不对应「人」。**

```
用户 ──属于──→ 用户组（岗位）──绑定──→ 角色 ──包含──→ 权限集
```

**具体到这家公司的系统**

| 岗位 | GitLab | AWS | 服务器 | VPN |
|---|---|---|---|---|
| 后端研发 | Developer（本项目） | dev 只读 | 无直接访问 | 研发网段 |
| 高级研发 | Maintainer（本项目） | dev 读写 | dev 通过堡垒机 | 研发网段 |
| 运维 | Reporter | prod 运维权限（无 IAM） | prod 堡垒机 | 运维网段 |
| 安全 | Reporter（全部） | **全账号只读 + 安全服务写** | 只读 + 审计日志 | 全网段 |
| 测试 | Developer（测试仓库） | staging | staging | 研发网段 |

**注意安全岗位的权限设计**：全局只读 + 安全服务可写。这正好呼应 JD 里的「职责分离」—— 安全能看能审计，但不直接改业务资源。**面试时主动说这一点，会显得你真的理解 SoD。**

**关键控制点**

| 控制 | 做法 |
|---|---|
| 权限申请 | 工单 + 双人审批（申请人上级 + 资源 Owner） |
| 临时权限 | 必须带过期时间（JIT / Break-glass），到期自动回收 |
| 权限互斥 | 同一人不能同时拥有「发起支付」和「审批支付」 |
| 定期审计 | 季度 recertification，Owner 不确认就自动回收 |

---

### Q12：员工入职、转岗、离职的权限生命周期？

**一句话核心：以 HR 系统为唯一数据源，自动化驱动，人工只做例外。**

```
HR 系统（唯一事实源）
      ↓ SCIM / API 同步
   IdP（Keycloak / Okta / Azure AD）
      ↓ SSO / SCIM
AWS · GitLab · VPN · 堡垒机 · 邮箱 · 内部系统
```

| 事件 | 动作 | 时限 |
|---|---|---|
| **入职** | 按岗位模板自动开通基线权限 | 到岗当天 |
| **转岗** | **先收回原权限，再按新岗位开通** | 3 个工作日 |
| **离职** | 立即禁用所有账号 + 吊销 Token/密钥 | **最后工作日下班前** |

**转岗是最容易出事的环节** —— 大多数公司只加不减，几年下来一个人攒了一堆权限（权限蠕变 / Privilege Creep）。面试时主动提这一点。

**离职 Checklist（可以直接背）**

```
□ 禁用 IdP 账号（一处禁用，全系统生效）
□ 吊销所有 API Token / Personal Access Token
□ 移除 AWS SSO 分配、删除残留 IAM User
□ 从 GitLab 所有 Group / Project 移除
□ 回收 VPN 证书、SSH 证书
□ 交接其名下的资源 Owner（避免出现无主资源）
□ 排查其是否在代码 / 文档里留有个人凭据
□ 邮箱转交接人，保留 N 个月后归档
```

**如何验证没漏**：每月跑一次对账脚本，把 HR 在职名单和各系统账号列表做差集，人工核对差异。

---

### Q13：权限审计怎么做？

**两类审计，都要有**

| 类型 | 频率 | 关注 |
|---|---|---|
| **静态**（有什么权限） | 季度 | 权限是否超出岗位需要、是否有孤儿账号 |
| **动态**（用了什么权限） | 持续 | 90 天未使用的权限直接回收 |

**动态审计是更高级的答法**，AWS 上可以直接拿数据：

```bash
# 查角色的服务级最后访问时间，找出从没用过的权限
aws iam generate-service-last-accessed-details \
  --arn arn:aws:iam::123456789012:role/app-role

aws iam get-service-last-accessed-details --job-id <job-id>
```

**审计发现问题后要闭环**：不是出个报告就结束，要有整改单、责任人、复查时间。

---

## 五、代码安全与 GitLab 安全

### Q14：GitLab 权限体系和分支保护怎么设计？

**GitLab 五个角色对应的实际能力**

| 角色 | 能干什么 | 给谁 |
|---|---|---|
| Guest | 看 Issue | 外部协作方 |
| Reporter | 拉代码、看 Pipeline | 安全、测试、PM |
| Developer | 推非保护分支、开 MR | 研发 |
| Maintainer | 推保护分支、改 CI 变量、管成员 | Tech Lead |
| Owner | 删项目、转移 | 极少数人 |

**关键点**：`Maintainer` 能读写 CI/CD 变量（里面可能有密钥），所以**这个角色要严格控制**，并且密钥不应该明文存在 CI 变量里（见第七节）。

**分支保护配置**

| 分支 | 允许推送 | 允许合并 | 必须条件 |
|---|---|---|---|
| `main` | **No one**（禁止任何人直推） | Maintainer | MR + 2 人审批 + Pipeline 通过 |
| `release/*` | No one | Maintainer | 同上 |
| `feature/*` | Developer | Developer | — |

**CODEOWNERS —— 让关键文件自动找到审批人**

```
# .gitlab/CODEOWNERS
*                       @backend-team
/infra/                 @ops-team @security-team
/.gitlab-ci.yml         @security-team          # 改流水线必须安全审批
/src/payment/           @payment-team @security-team
Dockerfile              @security-team
```

**Push Rules（GitLab Premium，能在服务端直接拒绝）**

```
Reject unsigned commits            ✅
Prevent pushing secret files       ✅   # 拦 .pem / id_rsa / .env
Commit message regex               ^(feat|fix|docs|refactor|chore)(\(.+\))?: .{1,}
Branch name regex                  ^(feature|bugfix|hotfix)\/[A-Z]+-\d+
Check whether author is a GitLab user  ✅   # 防伪造提交人
```

---

### Q15：代码安全扫描怎么落地？

**四类扫描，缺一不可**

| 类型 | 查什么 | 工具 | 阶段 |
|---|---|---|---|
| **SAST** | 代码漏洞（SQL 注入、XSS） | Semgrep / SonarQube / GitLab SAST | MR |
| **SCA** | 第三方依赖 CVE | Trivy / Dependency-Check / Dependabot | MR + 每日 |
| **Secret Detection** | 硬编码密钥 | gitleaks / trufflehog | **pre-commit + MR + 全历史** |
| **IaC** | Terraform / K8s 配置错误 | checkov / tfsec / kube-score | MR |

**GitLab CI 配置（可直接用）**

```yaml
stages: [security, build, deploy]

secret-detection:
  stage: security
  image: zricethezav/gitleaks:latest
  script:
    - gitleaks detect --source . --redact --exit-code 1 --report-format sarif --report-path gitleaks.sarif
  artifacts:
    reports:
      sast: gitleaks.sarif
  allow_failure: false        # 密钥泄露必须阻断，不给通融

sca-scan:
  stage: security
  image: aquasec/trivy:latest
  script:
    - trivy fs --scanners vuln --severity HIGH,CRITICAL --exit-code 1 .
  allow_failure: false

iac-scan:
  stage: security
  image: bridgecrew/checkov:latest
  script:
    - checkov -d ./infra --compact --quiet
  allow_failure: true         # 存量多，先观察再阻断
```

**推行策略**：`allow_failure: true` 观察 2 周 → 公示 TOP 问题 → 改成 `false` 阻断新增。**Secret Detection 例外，第一天就必须阻断**。

---

### Q16：代码里已经泄露了密钥，怎么处理？

**顺序绝不能错。这是高频考察点。**

```
1. 立即轮换密钥              ← 最重要！
2. 排查该密钥的使用记录（是否已被利用）
3. 从代码中移除，改用密钥管理服务
4. 清理 Git 历史（可选，优先级最低）
5. 复盘：为什么没被扫描拦住
```

**为什么轮换排第一**：

> 代码一旦推到远程，就要假设已经泄露了。GitHub/GitLab 有缓存、有 fork、有本地 clone，清历史根本清不干净。**只有轮换密钥能真正止损。** 很多人第一反应是 `git rebase` 删提交，那是在浪费黄金止损时间。

**清理历史的命令**（如果确实需要）：

```bash
# 推荐 git-filter-repo，比 filter-branch 快且安全
git filter-repo --path config/secrets.yml --invert-paths

# 清完必须强推 + 通知所有人重新 clone
# 注意：GitLab 上的 MR、Pipeline 日志里可能还有残留，要一并清理
```

**面试官可能追问：怎么防止再次发生？**

三道防线：
1. **pre-commit hook**（本地，最快反馈）
2. **CI 阻断**（服务端，防止绕过本地 hook）
3. **全历史定期扫描**（兜底，发现存量）

```bash
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
```

---

## 六、CI/CD 安全建设

### Q17：GitLab Runner 安全怎么管？

**Runner 是最容易被忽视的高危资产** —— 它有代码、有凭据、能连生产。

| 风险 | 说明 | 对策 |
|---|---|---|
| 跨项目污染 | 共享 Runner 上，A 项目能读到 B 项目的构建缓存 | 生产用 **Project 专属 Runner** |
| 容器逃逸 | `privileged=true` 的 Docker executor 等于给 root | 用 **Kaniko / BuildKit rootless** 构建镜像 |
| 凭据窃取 | Runner 上有部署凭据，任何能改 CI 的人都能拿 | **OIDC 临时凭据**，不存长期密钥 |
| 分支绕过 | 在 feature 分支改 `.gitlab-ci.yml` 就能跑生产部署 | 变量设 **Protected**，只有保护分支能用 |

**分环境隔离 Runner**

```yaml
deploy-prod:
  stage: deploy
  tags: [prod-runner]           # 专属 Runner，独立 AWS 账号
  environment: production
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual              # 生产部署必须人工点
  before_script:
    - echo "部署人：$GITLAB_USER_LOGIN"   # 留痕
```

**用 OIDC 干掉长期 AK（这是最能体现水平的一点）**

```yaml
deploy-aws:
  id_tokens:
    AWS_ID_TOKEN:
      aud: https://gitlab.example.com
  script:
    - >
      export $(aws sts assume-role-with-web-identity
      --role-arn $ROLE_ARN
      --role-session-name "gitlab-${CI_PIPELINE_ID}"
      --web-identity-token $AWS_ID_TOKEN
      --duration-seconds 3600
      --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]'
      --output text | awk '{print "AWS_ACCESS_KEY_ID="$1"\nAWS_SECRET_ACCESS_KEY="$2"\nAWS_SESSION_TOKEN="$3}')
    - aws s3 sync ./dist s3://my-bucket/
```

AWS 侧的信任策略可以精确到分支：

```json
{
  "Condition": {
    "StringEquals": {
      "gitlab.example.com:sub": "project_path:mygroup/myapp:ref_type:branch:ref:main"
    }
  }
}
```

**效果**：凭据 1 小时过期、只有 main 分支能拿到、泄露了也几乎无害。

---

### Q18：Docker 镜像安全？

| 环节 | 措施 |
|---|---|
| 基础镜像 | 统一收敛到公司私有 Registry 的几个基础镜像，禁止随便拉 Docker Hub |
| 构建 | 多阶段构建、非 root 用户运行、不装调试工具 |
| 扫描 | Trivy 扫 CRITICAL/HIGH，阻断构建 |
| 签名 | cosign 签名，部署时验签 |
| 运行 | 只读根文件系统、drop 所有 capabilities、resource limit |

**安全的 Dockerfile 范式**

```dockerfile
# 构建阶段
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build

# 运行阶段 —— 不带构建工具和源码
FROM node:24-alpine
RUN addgroup -S app && adduser -S app -G app     # 非 root
WORKDIR /app
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
USER app                                          # 关键
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**签名与验签**

```bash
cosign sign --key cosign.key registry.company.com/app:v1.2.3
cosign verify --key cosign.pub registry.company.com/app:v1.2.3
```

K8s 侧用 Kyverno / OPA Gatekeeper 强制「只允许运行已签名镜像」。

---

### Q19：开发、测试、生产环境隔离？

**隔离要做到四层，只做网络隔离是不够的**

| 层 | 做法 |
|---|---|
| 账号 | 三个独立 AWS 账号，**根本不互通** |
| 网络 | 独立 VPC，不做 Peering（需要互通时走 PrivateLink 单向） |
| 凭据 | 各环境独立密钥，prod 凭据只有 prod Runner 能拿到 |
| 数据 | **生产数据禁止流向测试环境**，测试用脱敏数据 |
| 人员 | 研发无 prod 权限，紧急情况走 Break-glass 审批 |

**Break-glass 流程（应急访问）**

```
研发申请 → 主管 + 安全双审批 → 授予 2 小时临时权限
         → 全程会话录制 → 到期自动回收 → 事后 24h 内出复盘
```

**面试加分**：
> 生产数据流向测试环境是最常见的合规雷区。我会在数据库层面禁止跨环境导出，并提供一个脱敏工具让测试团队自助生成测试数据，堵死「偷偷导一份生产库」的动机。

---

## 七、密钥和敏感信息管理

### Q20：支付 Key、API Token、数据库密码怎么管？

**分级管理（先分级，再谈方案）**

| 级别 | 例子 | 存储 | 轮换 | 访问控制 |
|---|---|---|---|---|
| L1 极高 | 支付私钥、根证书、KMS 主密钥 | **HSM / KMS**，永不导出 | 年度 | 双人授权 + 全审计 |
| L2 高 | 生产数据库密码、第三方支付 API Token | Secrets Manager / Vault | 30~90 天自动 | 服务身份，人不可读 |
| L3 中 | 内部服务 Token、测试环境凭据 | Secrets Manager | 半年 | 团队级 |
| L4 低 | 非敏感配置 | Parameter Store / 配置中心 | 按需 | 普通 |

**核心原则：能用动态凭据就不用静态**

```
最优 ──→ 不需要密钥（IAM Role / OIDC / IRSA）
次优 ──→ 动态短期凭据（Vault 动态生成 DB 账号，TTL 1 小时）
可接受 → 静态密钥 + 自动轮换（Secrets Manager）
最差 ──→ 静态密钥 + 人工轮换（≈ 永不轮换）
```

**Vault 动态数据库凭据示例**

```bash
# 配置：Vault 用管理员账号连 MySQL
vault write database/config/mysql-prod \
  plugin_name=mysql-database-plugin \
  connection_url="{{username}}:{{password}}@tcp(mysql.prod:3306)/" \
  allowed_roles="app-order"

# 定义角色：每次申请都新建一个只活 1 小时的账号
vault write database/roles/app-order \
  db_name=mysql-prod \
  creation_statements="CREATE USER '{{name}}'@'%' IDENTIFIED BY '{{password}}'; GRANT SELECT,INSERT,UPDATE ON orders.* TO '{{name}}'@'%';" \
  default_ttl="1h" max_ttl="24h"

# 应用申请
vault read database/creds/app-order
```

**好处**：密钥泄露的影响窗口从「永久」缩短到「1 小时」，而且每个实例的凭据都不同，出事能精确定位。

**AWS Secrets Manager 自动轮换**

```hcl
resource "aws_secretsmanager_secret_rotation" "db" {
  secret_id           = aws_secretsmanager_secret.db.id
  rotation_lambda_arn = aws_lambda_function.rotate.arn
  rotation_rules { automatically_after_days = 30 }
}
```

**应用侧读取（不落盘）**

```typescript
// 启动时从 Secrets Manager 读，只存在内存里
const secret = await new SecretsManagerClient({}).send(
  new GetSecretValueCommand({ SecretId: 'prod/db/order' }),
);
const { username, password } = JSON.parse(secret.SecretString!);
```

---

### Q21：如何避免密钥存在代码和配置文件里？

**存量清理 + 增量防护，两条线并行**

```
存量：全仓库历史扫描 → 按危险级排序 → 逐个轮换 → 改造读取方式
增量：pre-commit → CI 阻断 → 定期复扫
```

**存量扫描命令**

```bash
# 扫全部历史（不只是当前代码）
gitleaks detect --source . --log-opts="--all" --report-path leaks.json

# 或用 trufflehog，它会验证密钥是否还有效
trufflehog git file://. --only-verified
```

> `--only-verified` 很关键：它会实际去验证密钥是否仍然可用，帮你区分「真正紧急的」和「早已失效的」。

**改造后的配置读取**

```bash
# ❌ 之前：.env 提交进仓库
DB_PASSWORD=Prod@2024!

# ✅ 之后：只留引用，真值在 Secrets Manager
DB_SECRET_ID=prod/db/order
```

---

## 八、安全监控与事件响应

### Q22：安全日志体系怎么建？

**四层架构**

```
采集层  CloudTrail · VPC Flow Logs · ALB Log · auditd · 应用日志 · GitLab Audit Event
   ↓
传输层  Kinesis Firehose / Fluent Bit（加密传输）
   ↓
存储层  S3（热 90 天 → Glacier 1 年）+ OpenSearch（近 30 天可检索）
   ↓
分析层  SIEM 关联规则 → 告警 → SOAR 自动处置
```

**必须采集的日志（漏一个就有盲区）**

| 来源 | 关键字段 | 用途 |
|---|---|---|
| CloudTrail | 谁、什么 API、源 IP | 云上一切操作 |
| VPC Flow Logs | 五元组、ACCEPT/REJECT | 横向移动、异常外联 |
| auditd | 执行的命令、文件改动 | 主机入侵取证 |
| SSH / 堡垒机 | 登录、会话录像 | 运维行为审计 |
| GitLab Audit | 权限变更、仓库操作 | 代码泄露溯源 |
| 应用日志 | 登录、越权、支付 | 业务层攻击 |

**日志本身也要防护**：独立账号、只写不删、加密、完整性校验。

---

### Q23：怎么监控异常登录、权限提升、攻击行为？

**给出具体检测规则，别只说「用 SIEM 监控」**

| 场景 | 检测逻辑 | 级别 |
|---|---|---|
| 不可能旅行 | 同账号 1 小时内在两地登录，物理上到不了 | P1 |
| 暴力破解 | 5 分钟内失败 ≥ 10 次 | P2 |
| 撞库 | 同一 IP 尝试多个不同账号 | P1 |
| 非常规时段 | 凌晨 2-5 点的生产操作 | P2 |
| 权限提升 | `AttachUserPolicy` 且策略含 `*:*` | **P0** |
| 创建后门账号 | `CreateUser` + 立即 `CreateAccessKey` | **P0** |
| 日志被关 | `StopLogging` / `DeleteTrail` | **P0** |
| 数据外传 | S3 大量 GetObject 或异常出网流量 | P1 |
| 挖矿 | GuardDuty `CryptoCurrency:EC2/BitcoinTool` | P1 |

**降噪是关键**（面试官很吃这一套）：
> 告警太多等于没有告警。我会给每条规则设基线期，统计误报率，超过 20% 就先调规则而不是让人硬看。同时做告警聚合 —— 同一来源的同类事件合并成一条。

---

### Q24：安全事件响应流程？

**标准六阶段（PICERL 简化版）**

| 阶段 | 做什么 | 关键动作 |
|---|---|---|
| **准备** | 预案、通讯录、权限、演练 | 半年一次红蓝对抗 |
| **检测** | 确认是不是真事件、定级 | 30 分钟内定级 |
| **遏制** | 止血，**先保存证据再处置** | 隔离而非关机 |
| **根除** | 清后门、补漏洞、改密钥 | 找到入口点 |
| **恢复** | 恢复服务 + 加强监控 | 观察期 7 天 |
| **复盘** | 无指责复盘，改进项跟踪 | 5 个工作日内出报告 |

**遏制阶段最容易出错**，重点讲这个：

```
❌ 直接关机       → 内存证据全丢，无法取证
❌ 直接删除文件   → 破坏现场
✅ 正确顺序：
   1. 打快照（EBS Snapshot）保留磁盘证据
   2. 抓内存（如条件允许）
   3. 改安全组为「完全隔离」，机器还活着但断网
   4. 吊销该机器的 IAM Role 临时凭据
   5. 再做取证分析
```

**AWS 实例隔离脚本**

```bash
INSTANCE_ID=i-0abc123
# 1. 先打快照留证
VOL=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].BlockDeviceMappings[0].Ebs.VolumeId' --output text)
aws ec2 create-snapshot --volume-id $VOL --description "IR-$(date +%F)-$INSTANCE_ID"

# 2. 换成隔离安全组（无任何入站和出站）
aws ec2 modify-instance-attribute --instance-id $INSTANCE_ID --groups sg-quarantine

# 3. 吊销角色的现有临时凭据
aws iam put-role-policy --role-name <role> --policy-name RevokeOlderSessions \
  --policy-document file://revoke-sessions.json
```

**分级与响应时限**

| 级别 | 定义 | 响应 | 通报 |
|---|---|---|---|
| P0 | 生产数据泄露、勒索、支付系统被控 | 15 分钟 | CTO + 法务 |
| P1 | 服务器被入侵、权限被滥用 | 1 小时 | 安全负责人 |
| P2 | 高危漏洞被利用尝试 | 4 小时 | 团队群 |
| P3 | 扫描探测、低危告警 | 24 小时 | 工单 |

---

## 九、任职要求逐条自检

面试前把这张表填完，「弱」的项优先补。

| # | 要求 | 必答要点 | 自评 |
|---|---|---|---|
| 1 | 3年+ DevOps / 云安全 / 网络安全经验 | 准备 3 个 STAR 项目（见下节） | ☐强 ☐中 ☐弱 |
| 2 | 熟悉 AWS 云服务及安全体系 | IAM/SCP、VPC、CloudTrail、GuardDuty、Security Hub、KMS、Secrets Manager | ☐强 ☐中 ☐弱 |
| 3 | Linux 安全管理，了解 Windows 加固 | CIS 基线、SSH、auditd、sudo；Windows 说 GPO/LAPS/BitLocker 即可 | ☐强 ☐中 ☐弱 |
| 4 | 网络安全基础（远程接入、防火墙、安全组、SSH） | 纵深防御、Zero Trust 演进、SG vs NACL 区别 | ☐强 ☐中 ☐弱 |
| 5 | 数据库和中间件安全（MySQL/Redis/Kafka） | 见 Q7，Redis 未授权访问必须能讲透 | ☐强 ☐中 ☐弱 |
| 6 | GitLab、CI/CD、Docker、Kubernetes | 分支保护、OIDC、镜像扫描、K8s RBAC + NetworkPolicy | ☐强 ☐中 ☐弱 |
| 7 | IAM 权限设计和企业账号管理 | 见 Q1、Q11、Q12 | ☐强 ☐中 ☐弱 |
| 8 | OWASP Top 10、漏洞管理、安全扫描 | 见下方速记表 | ☐强 ☐中 ☐弱 |

### OWASP Top 10 (2021) 速记

| 编号 | 名称 | 一句话防御 |
|---|---|---|
| A01 | 权限控制失效 | 服务端强制鉴权，默认拒绝 |
| A02 | 加密机制失效 | 传输 TLS1.2+，存储加密，密码用 bcrypt/argon2 |
| A03 | 注入 | 参数化查询 + 输入校验 |
| A04 | 不安全设计 | 威胁建模前置到设计阶段 |
| A05 | 安全配置错误 | 基线 + 自动化检测（对应本岗位第一节） |
| A06 | 易受攻击的组件 | SCA 扫描 + 依赖更新 |
| A07 | 身份认证失效 | MFA + 防撞库 + 会话管理 |
| A08 | 软件和数据完整性失效 | 镜像签名验签 + 供应链管控 |
| A09 | 日志和监控失效 | 对应本岗位第八节 |
| A10 | SSRF | 出网白名单 + 禁用内网地址 + 云上强制 IMDSv2 |

> **A10 的云上重点**：SSRF 打 `169.254.169.254` 元数据服务偷 IAM 凭据，是云环境经典攻击路径（Capital One 事件）。**强制 IMDSv2** 是标准答案：
> ```bash
> aws ec2 modify-instance-metadata-options --instance-id i-xxx \
>   --http-tokens required --http-put-response-hop-limit 1
> ```

### 高频概念辨析（容易被追问）

| 问题 | 答案 |
|---|---|
| 安全组 vs NACL | SG 有状态、只有 allow、作用于实例；NACL 无状态、有 deny、作用于子网。SG 是主力，NACL 用于粗粒度黑名单 |
| 对称 vs 非对称加密 | 对称快（AES，用于数据）、非对称慢（RSA/ECC，用于密钥交换和签名）。实际是混合使用 |
| 认证 vs 授权 | 认证 = 你是谁（Authentication）；授权 = 你能干什么（Authorization） |
| HTTPS 握手 | TLS 握手协商密钥 → 证书验证服务端身份 → 后续用对称密钥加密 |
| JWT 的坑 | 无法主动失效（需配黑名单/短 TTL）、`alg:none` 攻击、不要放敏感信息（只是 Base64 编码不是加密） |

---

## 十、项目经验包装（STAR）

准备 3~4 个，覆盖不同维度。**每个都要有数字。**

### 模板

```
Situation  什么背景、什么问题（带数据：多少台机器、多少个账号、多少条告警）
Task       你的职责边界是什么
Action     你怎么做的（分步骤，突出技术决策和取舍）
Result     量化结果（降低了多少、缩短了多少、通过了什么审计）
```

### 示例一：AWS 权限治理

> **S**：接手时 AWS 单账号混用，40+ 个 IAM User 持有长期 AccessKey，其中 12 个超过一年未轮换，3 个拥有 AdministratorAccess。
>
> **T**：负责在不影响业务的前提下，3 个月内完成权限体系改造。
>
> **A**：
> 1. 用 Credential Report + Access Analyzer 摸底，输出风险清单并按「是否可对外访问」排序
> 2. 拆多账号（prod/staging/dev/security/log-archive），用 SCP 做全局护栏
> 3. 人员切 SSO，机器切 Role / OIDC，**给业务方 4 周迁移窗口并提供改造文档**
> 4. 最后用 SCP 禁止创建新的 AccessKey，杜绝回潮
>
> **R**：长期 AccessKey 从 40+ 降到 2 个（外部供应商，单独审批 + 季度轮换），Security Hub 分数从 62 提升到 89，通过等保三级测评。

### 示例二：CI/CD 安全改造

> **S**：GitLab 有 80+ 仓库，密钥明文存在 CI 变量里，任何 Maintainer 都能看到生产数据库密码；`main` 分支可直推。
>
> **T**：建立代码到发布的全链路安全管控。
>
> **A**：
> 1. 上 gitleaks 扫全历史，发现 23 处硬编码密钥，**先全部轮换再清理代码**
> 2. 配置分支保护 + CODEOWNERS，`.gitlab-ci.yml` 的修改强制安全审批
> 3. GitLab → AWS 改用 OIDC 临时凭据，信任策略精确到分支
> 4. SAST/SCA/Secret Detection 接入流水线，先观察 2 周再改为阻断
>
> **R**：CI 中长期凭据清零；上线后 6 个月内拦截 11 次密钥提交尝试；生产发布改为人工确认 + 全程留痕。

### 示例三：安全事件响应

> **S**：GuardDuty 告警某台 EC2 出现挖矿行为（`CryptoCurrency:EC2/BitcoinTool.B!DNS`）。
>
> **T**：作为值班响应人，负责遏制、根除和复盘。
>
> **A**：
> 1. **先打 EBS 快照保留证据**，再切换到隔离安全组（没有直接关机）
> 2. 吊销该实例 Role 的临时凭据，排查 CloudTrail 确认凭据未被用于横向移动
> 3. 取证发现入口是一个对公网开放的 Redis 未授权访问，攻击者通过 `CONFIG SET` 写入 SSH 公钥
> 4. 全网排查同类问题，发现另外 4 台存在相同配置
>
> **R**：2 小时内完成遏制，未发生数据泄露；推动中间件安全基线（Redis 强制 requirepass + 禁 CONFIG + 不允许公网），并在 Config 上加了持续检测规则。

> **注意**：这些是**框架示例**，请替换成你自己的真实经历。面试官会深挖细节，编的故事经不起追问。如果没做过某个场景，诚实说「没做过，但我的思路是……」反而加分。

---

## 十一、如果我入职，前 90 天怎么做

**这是高概率被问的问题**，也是最能体现体系化思维的地方。

| 阶段 | 目标 | 具体动作 | 产出 |
|---|---|---|---|
| **0~30 天**<br>摸底 | 搞清现状，不动刀 | 资产盘点、权限梳理、日志覆盖度检查、跑一遍 Security Hub / CIS 扫描；和研发、运维各聊一轮 | 《安全现状评估报告》+ 风险清单（按「影响 × 可利用性」排序） |
| **31~60 天**<br>止血 | 解决高危、见效快的问题 | 高危漏洞修复；MFA 全覆盖；长期 AccessKey 清理；日志集中 + P0 告警上线；Secret Detection 接入 CI | 高危清零、关键告警闭环 |
| **61~90 天**<br>建体系 | 从救火转向机制 | 安全基线固化到 IaC；权限生命周期自动化；漏洞管理 SLA 落地；应急预案 + 一次演练 | 制度文档 + 自动化流水线 + 可量化指标 |

**前 30 天的原则要说清楚**：
> 先不动生产。我会先做完整的资产和权限盘点，因为在不了解业务的情况下推安全策略，很容易误伤线上并失去业务方的信任。第一个月的核心产出是一份有优先级的风险清单，和业务方一起确认整改节奏。

**可量化的目标指标**

| 指标 | 基线 | 90 天目标 |
|---|---|---|
| Security Hub 合规分 | 待测 | ≥ 85 |
| 高危漏洞平均修复时长 | 待测 | ≤ 7 天 |
| 长期 AccessKey 数量 | 待测 | ≤ 5 |
| MFA 覆盖率 | 待测 | 100%（管理员/运维） |
| 关键日志采集覆盖率 | 待测 | ≥ 95% |
| P0 告警平均响应时长 | — | ≤ 15 分钟 |

---

## 十二、反问环节

**必问（体现你在认真评估这份工作）**

1. 安全团队目前几个人？我这个岗位的**决策边界**在哪里 —— 能否直接叫停有风险的上线？
2. JD 提到「与运维团队形成职责分离」，目前分工的**痛点**是什么？
3. 公司是否有**合规要求**（等保、PCI DSS、ISO 27001）？有明确的时间表吗？
4. 目前最让团队头疼的安全问题是什么？
5. 这个岗位**半年内最希望我解决什么**？

**加分（显示你理解安全推行的现实阻力）**

6. 安全策略推行时，如果和业务交付速度冲突，公司倾向于怎么权衡？有没有明确的升级路径？
7. 安全团队有独立预算吗？采购商业工具的流程是怎样的？
8. 是否已经有基础设施即代码（Terraform/Ansible）？覆盖率大概多少？

> 第 6 题特别重要。**安全岗位失败的最常见原因不是技术不行，是推不动。** 问这个问题既显示你有实战经验，也能帮你判断这家公司值不值得去。

**不要问**：加班多不多、能不能远程（这些留到 HR 环节）。

---

## 十三、面试前速查

### 必须能脱口而出的命令

```bash
# AWS 摸底三件套
aws iam generate-credential-report && aws iam get-credential-report --output text --query Content | base64 -d
aws accessanalyzer list-findings --analyzer-arn <arn>
aws securityhub get-findings --filters '{"SeverityLabel":[{"Value":"CRITICAL","Comparison":"EQUALS"}]}'

# 主机排查
last -20                      # 登录记录
ss -tulnp                     # 监听端口
ausearch -k root_cmd          # root 执行过的命令
find / -perm -4000 -type f 2>/dev/null   # SUID 后门排查

# 密钥泄露
gitleaks detect --source . --log-opts="--all"
trufflehog git file://. --only-verified

# 镜像扫描
trivy image --severity HIGH,CRITICAL myapp:latest
```

### 高频缩写

| 缩写 | 全称 | 含义 |
|---|---|---|
| SoD | Separation of Duties | 职责分离 |
| PoLP | Principle of Least Privilege | 最小权限 |
| ZTNA | Zero Trust Network Access | 零信任网络访问 |
| SAST / DAST / SCA | 静态 / 动态 / 成分分析 | 三类代码安全扫描 |
| SIEM / SOAR | 安全信息事件管理 / 安全编排自动响应 | 监控与自动处置 |
| IRSA | IAM Roles for Service Accounts | EKS Pod 级 IAM |
| MTTD / MTTR | 平均检测 / 修复时长 | 安全运营核心指标 |
| RPO / RTO | 恢复点 / 恢复时间目标 | 灾备指标 |

### 三条贯穿始终的话术

1. **纵深防御**：任何单点都可能失效，所以事前（IaC 扫描）、事中（SCP 护栏）、事后（Config 检测）三层都要有。
2. **默认安全**：不靠人自觉，靠平台默认就是安全的，越权反而要走流程。
3. **可度量**：安全工作必须有指标，否则说不清价值，也拿不到资源。

---

## 附：还需要补的（诚实面对）

如果下面这些你没实操过，面试时**不要硬编**。正确说法是：

> 这块我在生产环境没有直接落地过，但我了解它的原理和方案，我的思路是……如果入职我会优先补齐。

诚实 + 有思路 > 编造经历被追问到崩。面试官大多能听出来。

| 领域 | 如果没做过，最低要能讲清 |
|---|---|
| Kubernetes 安全 | RBAC、NetworkPolicy、PodSecurity、镜像准入控制 |
| 等保 / PCI DSS | 大致流程和对技术的要求（日志留存 6 个月、密钥管理等） |
| HSM / KMS 深度 | 信封加密原理、密钥分层 |
| 红蓝对抗 | ATT&CK 框架、常见横向移动手法 |
