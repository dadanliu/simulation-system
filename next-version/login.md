常见会话方案
Cookie + Session：浏览器自动带 Cookie，服务端用 Session 识别用户登录态，这是最传统也很常见的方案。

Token/JWT：登录成功后服务端返回 Token，客户端后续一般放在 HTTP Header 里提交，常用于 SPA、移动端和微服务场景。

SSO 单点登录：多个系统共用一套认证中心，用户登录一次后可访问多个系统。

常见登录方式
账号密码登录：最基础、适用最广。

短信验证码登录：国内产品很常见，降低记密码成本。

第三方登录：基于 OAuth 的微信、QQ、Google 等授权登录

接入 google\
接入 weixin
