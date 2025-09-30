# 🎙️ AI语音点餐系统

基于OpenAI实时API和WebRTC的实时语音餐厅点餐系统。通过AI驱动的语音对话自然地处理电话订单。

## ✨ 功能特色

- **实时语音对话**：使用OpenAI GPT-4o-mini实时模型进行自然的电话订餐交互
- **WebRTC集成**：客户端WebRTC实现的低延迟音频流传输
- **动态菜单管理**：易于使用的网页界面管理菜单项目和分类
- **订单显示**：查看最近的订单，包含客户姓名、菜品和总价
- **成本跟踪**：在浏览器控制台实时监控token使用量和成本
- **专业订单流程**：
  - AI询问客户姓名
  - AI询问取餐时间
  - AI确认完整订单及总价
  - 专业结束语："好的，[时间]见。注意安全，再见！"

## 🚀 快速开始

### 前置要求

- Node.js（推荐v18或更高版本）
- 拥有实时API访问权限的OpenAI API密钥
- 支持WebRTC的现代浏览器（Chrome、Firefox、Edge）

### 安装步骤

1. **克隆或下载项目**
   ```bash
   cd AI_Audio_Ordering_System
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **创建环境文件**

   在项目根目录创建`.env`文件：
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3000
   ```

4. **启动服务器**
   ```bash
   npm start
   ```

   开发模式（自动重载）：
   ```bash
   npm run dev
   ```

5. **在浏览器中打开**

   访问：`http://localhost:3000`

## 📦 依赖包

```json
{
  "@openai/agents": "^0.0.9",     // OpenAI代理SDK，用于实时API
  "express": "^4.18.2",            // Web服务器框架
  "dotenv": "^16.3.1",             // 环境变量管理
  "cors": "^2.8.5",                // 跨域资源共享
  "zod": "^3.22.4"                 // 模式验证
}
```

### 安装所有依赖：
```bash
npm install express dotenv cors zod @openai/agents
```

## 📁 项目结构

```
AI_Audio_Ordering_System/
├── server.js              # Express服务器，带token生成功能
├── public/
│   ├── index.html         # 主要语音点餐界面
│   └── menu.html          # 菜单管理界面
├── menu.json              # 餐厅菜单数据
├── .env                   # 环境变量（需要创建）
├── package.json           # 项目依赖
└── README.md              # 本文件
```

## 🎯 使用方法

### 接受订单

1. 点击**麦克风按钮**开始语音会话
2. AI将立即问候客户
3. 客户通过语音自然地下订单
4. AI询问客户姓名和取餐时间
5. AI确认完整订单及总价
6. 点击**断开连接**按钮结束会话

### 管理菜单

1. 访问：`http://localhost:3000/menu`
2. 添加、编辑或删除菜单分类和菜品
3. 更新价格、描述和库存状态
4. 点击**保存菜单**保存更改

### 监控成本

打开浏览器开发者工具（F12）→ 控制台标签页查看：
- 每次响应的token使用量和成本
- 断开连接时的会话总成本

示例输出：
```
💰 响应成本明细：
   输入tokens:   1,250 × $0.000032 = $0.000040
   输出tokens:   850 × $0.000064 = $0.000054
   响应成本:     $0.000094
   会话总计:     $0.000094
```

## ⚙️ 配置

### 菜单结构（`menu.json`）

```json
{
  "restaurant": {
    "name": "老王餐厅",
    "phone": "(555) 123-4567",
    "hours": "周一至周日：上午10点-晚上10点"
  },
  "categories": [
    {
      "id": "burgers",
      "name": "汉堡类",
      "items": [
        {
          "id": "classic-burger",
          "name": "经典芝士汉堡",
          "description": "牛肉饼配芝士、生菜、番茄和泡菜",
          "price": 10.99,
          "available": true
        }
      ]
    }
  ]
}
```

### AI模型设置

编辑`server.js`第109行以更改模型：
```javascript
model: 'gpt-4o-mini-realtime-preview'  // 当前模型
```

### 定价（基于当前实现）

- 输入tokens：每100万tokens $32.00（每token $0.000032）
- 输出tokens：每100万tokens $64.00（每token $0.000064）

## 🔧 API端点

- `GET /` - 语音点餐界面
- `GET /menu` - 菜单管理界面
- `GET /api/menu` - 获取菜单数据（JSON）
- `POST /api/menu` - 更新菜单数据
- `POST /api/token` - 为实时API生成临时token
- `GET /api/health` - 健康检查

## 🎨 功能详细说明

### WebRTC连接流程

1. 客户端从服务器请求临时token
2. 服务器生成带有菜单上下文的token
3. 客户端建立WebRTC对等连接
4. 音频双向低延迟流传输
5. AI通过语音实时响应

### 订单显示

- 订单存储在浏览器localStorage中
- 显示客户姓名、菜品和总价
- 显示每个订单的时间戳
- 页面刷新后持续存在

## 🐛 故障排除

**端口已被占用：**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <process_id> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

**无法访问麦克风：**
- 确保浏览器有麦克风权限
- 检查系统麦克风设置
- 如有问题请尝试HTTPS（WebRTC偏好安全上下文）

**API成本过高：**
- 监控控制台中的token使用量
- 较短的对话 = 较低的成本
- 完成后使用断开连接按钮

**"从服务器未收到token"：**
- 验证`.env`文件包含有效的`OPENAI_API_KEY`
- 检查服务器日志中的token生成错误
- 更改`.env`后重启服务器

## 📝 许可证

MIT

## 🤝 贡献

欢迎fork、修改并用于您自己的餐厅订餐系统！

## 📚 资源

- [OpenAI实时API文档](https://platform.openai.com/docs/guides/realtime-webrtc)
- [WebRTC API参考](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [OpenAI API密钥](https://platform.openai.com/api-keys)

## 📧 支持

问题相关：
- OpenAI API：查看[OpenAI文档](https://platform.openai.com/docs)
- WebRTC：验证浏览器兼容性
- 本项目：检查控制台日志获取详细错误信息