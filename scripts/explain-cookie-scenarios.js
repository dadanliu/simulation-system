const { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } = {
  SESSION_COOKIE_NAME: "next_bff_session",
  SESSION_MAX_AGE_SECONDS: 60 * 60 * 24
};

function buildCookie({ maxAge, sameSite, secure }) {
  const parts = [`${SESSION_COOKIE_NAME}=demo-session`, "Path=/", "HttpOnly"];

  if (sameSite) {
    parts.push(`SameSite=${sameSite}`);
  }

  if (secure) {
    parts.push("Secure");
  }

  if (maxAge !== undefined) {
    parts.push(`Max-Age=${maxAge}`);
  }

  return parts.join("; ");
}

function printCase(title, rows) {
  console.log("");
  console.log(`## ${title}`);
  console.log("");

  for (const row of rows) {
    console.log(`- ${row.label}:`);
    console.log(`  Set-Cookie: ${row.cookie}`);
    console.log(`  行为: ${row.behavior}`);
  }
}

console.log("# Cookie 属性场景模拟");
console.log("");
console.log(
  "这个脚本不启动浏览器，只展示同一个 session cookie 在不同属性下的浏览器行为差异。"
);
console.log(
  "真实验证请使用 `pnpm dev:https`，再到 DevTools / Application / Cookies 查看。"
);

printCase("SameSite 对比", [
  {
    behavior:
      "浏览器使用默认策略。现代浏览器通常按 Lax 处理，但不要依赖隐式默认值，团队协作和跨浏览器行为不够明确。",
    cookie: buildCookie({ maxAge: SESSION_MAX_AGE_SECONDS, secure: true }),
    label: "没有 SameSite"
  },
  {
    behavior:
      "跨站子请求通常不会携带 cookie，降低 CSRF 风险；正常同站后台页面和 API 请求会携带 cookie。",
    cookie: buildCookie({
      maxAge: SESSION_MAX_AGE_SECONDS,
      sameSite: "Lax",
      secure: true
    }),
    label: "SameSite=Lax"
  },
  {
    behavior:
      "跨站也允许携带 cookie，必须同时设置 Secure；适合确实需要第三方上下文的场景，不适合默认后台管理系统。",
    cookie: buildCookie({
      maxAge: SESSION_MAX_AGE_SECONDS,
      sameSite: "None",
      secure: true
    }),
    label: "SameSite=None + Secure"
  }
]);

printCase("Secure 对比", [
  {
    behavior:
      "HTTP 和 HTTPS 请求都可能携带 cookie。本地 HTTP 开发可用，但生产环境不安全。",
    cookie: buildCookie({ maxAge: SESSION_MAX_AGE_SECONDS, sameSite: "Lax" }),
    label: "没有 Secure"
  },
  {
    behavior:
      "只有 HTTPS 请求会携带 cookie。生产推荐；如果仍用 http://localhost 访问，登录后 cookie 不会被发送，表现为刷新后未登录。",
    cookie: buildCookie({
      maxAge: SESSION_MAX_AGE_SECONDS,
      sameSite: "Lax",
      secure: true
    }),
    label: "有 Secure"
  }
]);

printCase("Max-Age 对比", [
  {
    behavior:
      "会话 cookie。通常浏览器会在会话结束后清除，具体行为受浏览器恢复会话策略影响。",
    cookie: buildCookie({ sameSite: "Lax", secure: true }),
    label: "没有 Max-Age"
  },
  {
    behavior: "持久 cookie。24 小时内浏览器会继续保存并发送，超过后自动过期。",
    cookie: buildCookie({
      maxAge: SESSION_MAX_AGE_SECONDS,
      sameSite: "Lax",
      secure: true
    }),
    label: "Max-Age=86400"
  },
  {
    behavior: "立即过期。常用于退出登录时清理 cookie。",
    cookie: buildCookie({ maxAge: 0, sameSite: "Lax", secure: true }),
    label: "Max-Age=0"
  }
]);

console.log("");
console.log("当前项目推荐：");
console.log(
  `Set-Cookie: ${buildCookie({ maxAge: SESSION_MAX_AGE_SECONDS, sameSite: "Lax", secure: true })}`
);
console.log("");
console.log("本地 HTTP 开发不强制 Secure；HTTPS 或生产环境开启 Secure。");
